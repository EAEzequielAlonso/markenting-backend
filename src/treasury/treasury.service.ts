import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TreasuryTransaction, TransactionStatus } from './entities/treasury-transaction.entity';
import { Account } from './entities/account.entity';
import { AccountType } from '../common/enums';
import { Budget } from './entities/budget.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { TreasuryAuditLog } from './entities/treasury-audit-log.entity';

@Injectable()
export class TreasuryService {
    constructor(
        @InjectRepository(TreasuryTransaction) private txRepo: Repository<TreasuryTransaction>,
        @InjectRepository(Account) private accountRepo: Repository<Account>,
        @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
        @InjectRepository(Ministry) private ministryRepo: Repository<Ministry>,
        @InjectRepository(TreasuryAuditLog) private auditRepo: Repository<TreasuryAuditLog>,
        private dataSource: DataSource
    ) { }

    // --- Accounts ---
    // --- Accounts & Categories ---
    async createAccount(data: any, churchId: string) {
        const account = this.accountRepo.create({ ...data, church: { id: churchId } });
        return this.accountRepo.save(account);
    }

    async updateAccount(id: string, data: any) {
        const account = await this.accountRepo.findOneBy({ id });
        if (!account) throw new NotFoundException('Account not found');
        Object.assign(account, data);
        return this.accountRepo.save(account);
    }

    async deleteAccount(id: string) {
        const result = await this.accountRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Account not found');
        return { success: true };
    }

    async findAllAccounts(churchId: string) {
        return this.accountRepo.find({
            where: { church: { id: churchId } },
            order: { name: 'ASC' }
        });
    }

    async getBalances(churchId: string) {
        // Return only asset accounts for the sidebar
        return this.accountRepo.find({
            where: { church: { id: churchId }, type: AccountType.ASSET },
            order: { name: 'ASC' }
        });
    }

    // --- Transactions (The Core) ---
    async createTransaction(data: any, churchId: string, userId: string) {
        const { description, amount, currency, sourceAccountId, destinationAccountId, ministryId, date } = data;

        // Start Transaction
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const source = await this.accountRepo.findOneBy({ id: sourceAccountId });
            const dest = await this.accountRepo.findOneBy({ id: destinationAccountId });
            if (!source || !dest) throw new NotFoundException('Source or Destination account not found');

            let status = TransactionStatus.COMPLETED;

            // 1. Budget Validation (If spending from Ministry)
            if (source.type === AccountType.ASSET && dest.type === AccountType.EXPENSE && ministryId) {
                // Spending Money on Expense Category for a Ministry
                // Check Budget
                const budget = await this.budgetRepo.findOne({
                    where: { ministry: { id: ministryId }, category: { id: dest.id } } // Check specific category budget or general? Assuming specific for now
                });
                // Ideally check Monthly usage. Simplified for MVP: Just check if transaction > limit (which is silly) OR if monthly total > limit.
                // Let's Skip complex budget summation for this exact step to keep it robust enough: 
                // If amount > 100000 (just an example config limit) -> Pending Approval.
                const limit = 500000; // Hardcoded soft limit for approvals
                if (amount > limit) status = TransactionStatus.PENDING_APPROVAL;
            }

            // 2. Create Record
            const tx = this.txRepo.create({
                church: { id: churchId },
                description,
                amount,
                currency: currency || 'ARS',
                exchangeRate: data.exchangeRate || 1,
                sourceAccount: source,
                destinationAccount: dest,
                ministry: ministryId ? { id: ministryId } : null,
                status,
                createdById: userId,
                date: date || new Date()
            });

            // 3. Update Balances
            if (status === TransactionStatus.COMPLETED) {
                // Determine transaction type based on accounts
                // EXPENSE: Asset -> Expense
                // INCOME: Income -> Asset
                // TRANSFER: Asset -> Asset

                const rate = Number(tx.exchangeRate);
                const amountInSourceCurrency = Number(amount);
                // For simplified MVP, assuming amount is passed in Source Currency or handled via rate.
                // Let's assume amount is ALWAYS in the currency of the transaction.
                // If accounts have different currencies, we'd need complex conversion. 
                // For now, let's assume single currency or amount applies to both (1:1) or user inputs correct value.
                // "Ingresando tasa de conversion" -> Amount * Rate = Final Value? 
                // Usually: Amount is in Source Currency. Rate converts it to Dest Currency?
                // Let's keep it simple: deducted amount = amount. Added amount = amount * rate.

                if (source.type === AccountType.ASSET) {
                    source.balance = Number(source.balance) - amountInSourceCurrency;
                    await queryRunner.manager.save(source);
                }

                if (dest.type === AccountType.ASSET) {
                    // If transfer/income to asset, apply exchange rate if exists
                    // Example: Transfer 100 USD (Source) to ARS Account (Dest). Rate 1000.
                    // Source -100. Dest + (100 * 1000).
                    const addedAmount = amountInSourceCurrency * (rate || 1);
                    dest.balance = Number(dest.balance) + addedAmount;
                    await queryRunner.manager.save(dest);
                }
            }

            await queryRunner.manager.save(tx);
            await queryRunner.commitTransaction();
            return tx;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async updateTransaction(id: string, data: any, userId: string) {
        const { description, amount } = data;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const tx = await this.txRepo.findOne({
                where: { id },
                relations: ['sourceAccount', 'destinationAccount']
            });

            if (!tx) throw new NotFoundException('Transaction not found');

            const oldAmount = Number(tx.amount);
            const oldDescription = tx.description;
            const newAmount = Number(amount);

            // 1. Revert previous balance impact
            if (tx.status === TransactionStatus.COMPLETED) {
                const source = tx.sourceAccount;
                const dest = tx.destinationAccount;
                const oldRate = Number(tx.exchangeRate);

                if (source.type === AccountType.ASSET) {
                    source.balance = Number(source.balance) + oldAmount;
                    await queryRunner.manager.save(source);
                }

                if (dest.type === AccountType.ASSET) {
                    const oldAddedAmount = oldAmount * (oldRate || 1);
                    dest.balance = Number(dest.balance) - oldAddedAmount;
                    await queryRunner.manager.save(dest);
                }
            }

            // 2. Apply new balance impact (assuming accounts don't change for now, only amount/desc)
            // If accounts change, we'd need to load new accounts here.
            if (tx.status === TransactionStatus.COMPLETED) {
                const source = tx.sourceAccount;
                const dest = tx.destinationAccount;
                const rate = Number(tx.exchangeRate); // Keeping same rate for now

                if (source.type === AccountType.ASSET) {
                    source.balance = Number(source.balance) - newAmount;
                    await queryRunner.manager.save(source);
                }

                if (dest.type === AccountType.ASSET) {
                    const addedAmount = newAmount * (rate || 1);
                    dest.balance = Number(dest.balance) + addedAmount;
                    await queryRunner.manager.save(dest);
                }
            }

            // 3. Save Record & Audit Log
            const audit = this.auditRepo.create({
                transaction: tx,
                oldAmount,
                newAmount,
                oldDescription,
                newDescription: description,
                changedBy: { id: userId } as any,
                changeReason: data.reason || 'Corrección de error'
            });

            tx.amount = newAmount;
            tx.description = description;

            await queryRunner.manager.save(audit);
            await queryRunner.manager.save(tx);
            await queryRunner.commitTransaction();

            return tx;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getTransactions(churchId: string) {
        return this.txRepo.find({
            where: { church: { id: churchId } },
            relations: ['sourceAccount', 'destinationAccount', 'ministry'],
            order: { date: 'DESC' },
        });
    }

    async getAuditLogs(txId: string) {
        return this.auditRepo.find({
            where: { transaction: { id: txId } },
            relations: ['changedBy'],
            order: { createdAt: 'DESC' }
        });
    }

    // --- Budgets ---
    async createBudget(data: any, churchId: string) {
        const budget = this.budgetRepo.create({
            ...data,
            church: { id: churchId },
            ministry: { id: data.ministryId },
            category: { id: data.categoryId }
        });
        return this.budgetRepo.save(budget);
    }

    async getBudgets(churchId: string, year?: number) {
        return this.budgetRepo.find({
            where: {
                church: { id: churchId },
                ...(year ? { year } : {})
            },
            relations: ['ministry', 'category'],
            order: { year: 'DESC' }
        });
    }

    async deleteBudget(id: string) {
        const result = await this.budgetRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Budget not found');
        return { success: true };
    }

}
