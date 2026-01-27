import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Account } from './account.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';

export enum TransactionStatus {
    COMPLETED = 'completed',
    PENDING_APPROVAL = 'pending_approval',
    REJECTED = 'rejected'
}

@Entity('treasury_transactions')
export class TreasuryTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church)
    church: Church;

    @Column()
    description: string;

    @Column('decimal', { precision: 15, scale: 2 })
    amount: number;

    @Column({ default: 'ARS' })
    currency: string;

    @Column('decimal', { precision: 10, scale: 6, default: 1 })
    exchangeRate: number; // Rate to base currency (e.g. USD)

    @ManyToOne(() => Account, (acc) => acc.outgoingTransactions, { nullable: true })
    sourceAccount: Account; // Origen (e.g. Caja Chica OR Ingreso Diezmos if incoming?? No, if Income: Source = IncomeCategory, Dest = Bank)

    @ManyToOne(() => Account, (acc) => acc.incomingTransactions, { nullable: true })
    destinationAccount: Account; // Destino (e.g. Gasto Luz OR Banco)

    // Optional link to Ministry for budget tracking
    @ManyToOne(() => Ministry, { nullable: true })
    ministry: Ministry;

    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.COMPLETED })
    status: TransactionStatus;

    @Column({ nullable: true })
    createdById: string; // Audit

    @CreateDateColumn()
    date: Date;
}
