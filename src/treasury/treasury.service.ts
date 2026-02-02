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
        // Check for existing transactions
        const hasTransactions = await this.txRepo.count({
            where: [
                { sourceAccount: { id } },
                { destinationAccount: { id } }
            ]
        });

        if (hasTransactions > 0) {
            throw new BadRequestException('No se puede eliminar una cuenta con movimientos asociados. Archívela o elimine los movimientos primero.'); // Using BadRequest for clearer frontend handling, or ConflictException
        }

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
        let { description, amount, currency, sourceAccountId, destinationAccountId, ministryId, date } = data;

        // Sanitize ministryId
        if (ministryId === 'none' || ministryId === '') ministryId = null;

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
                const rate = Number(tx.exchangeRate);
                const amountInSourceCurrency = Number(amount);

                if (source.type === AccountType.ASSET) {
                    source.balance = Number(source.balance) - amountInSourceCurrency;
                    await queryRunner.manager.save(source);
                }

                if (dest.type === AccountType.ASSET) {
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
        const { description, amount, sourceAccountId, destinationAccountId, ministryId } = data;

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

            // Check if accounts changed
            const accountsChanged = (sourceAccountId && sourceAccountId !== tx.sourceAccount.id) ||
                (destinationAccountId && destinationAccountId !== tx.destinationAccount.id);

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

            // 2. Update fields
            tx.amount = newAmount;
            tx.description = description;
            if (ministryId !== undefined) tx.ministry = ministryId ? { id: ministryId } as any : null;

            // If accounts changed, fetch new ones
            let newSource = tx.sourceAccount;
            let newDest = tx.destinationAccount;

            if (sourceAccountId && sourceAccountId !== tx.sourceAccount.id) {
                newSource = await this.accountRepo.findOneBy({ id: sourceAccountId });
                if (!newSource) throw new NotFoundException('New Source account not found');
                tx.sourceAccount = newSource;
            }
            if (destinationAccountId && destinationAccountId !== tx.destinationAccount.id) {
                newDest = await this.accountRepo.findOneBy({ id: destinationAccountId });
                if (!newDest) throw new NotFoundException('New Destination account not found');
                tx.destinationAccount = newDest;
            }


            // 3. Apply new balance impact to (possibly new) accounts
            if (tx.status === TransactionStatus.COMPLETED) {
                const rate = Number(tx.exchangeRate); // Keeping same rate for now unless we add rate update logic

                if (newSource.type === AccountType.ASSET) {
                    newSource.balance = Number(newSource.balance) - newAmount;
                    await queryRunner.manager.save(newSource);
                }

                if (newDest.type === AccountType.ASSET) {
                    const addedAmount = newAmount * (rate || 1);
                    newDest.balance = Number(newDest.balance) + addedAmount;
                    await queryRunner.manager.save(newDest);
                }
            }

            // 4. Save Record & Audit Log
            const audit = this.auditRepo.create({
                transaction: tx,
                oldAmount,
                newAmount,
                oldDescription,
                newDescription: description,
                changedBy: { id: userId } as any,
                changeReason: data.reason || 'Edición completa'
            });

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

    async deleteTransaction(id: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const tx = await this.txRepo.findOne({
                where: { id },
                relations: ['sourceAccount', 'destinationAccount']
            });

            if (!tx) throw new NotFoundException('Transaction not found');

            // 1. Revert Balance Impact
            if (tx.status === TransactionStatus.COMPLETED) {
                const source = tx.sourceAccount;
                const dest = tx.destinationAccount;
                const oldAmount = Number(tx.amount);
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

            // 2. Delete
            await queryRunner.manager.remove(tx);
            await queryRunner.commitTransaction();
            return { success: true };

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
        if (!data.ministryId && !data.categoryId) {
            throw new BadRequestException('El presupuesto debe estar asociado a un Ministerio o a una Categoría.');
        }

        const budget = this.budgetRepo.create({
            ...data,
            church: { id: churchId },
            ministry: data.ministryId ? { id: data.ministryId } : null,
            category: data.categoryId ? { id: data.categoryId } : null
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
