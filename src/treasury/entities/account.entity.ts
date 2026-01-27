import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { TreasuryTransaction } from './treasury-transaction.entity';
import { AccountType } from 'src/common/enums';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string; // e.g., "Banco General", "Caja Chica", "Gastos de Luz"

    @Column({ type: 'enum', enum: AccountType })
    type: AccountType;

    @Column({ nullable: true })
    currency: string; // 'USD', 'ARS', etc.

    @Column('decimal', { precision: 15, scale: 2, default: 0 })
    balance: number; // Current balance (cached for assets/liabilities)

    @ManyToOne(() => Church, (church) => church.accounts)
    church: Church;

    @OneToMany(() => TreasuryTransaction, (tx) => tx.sourceAccount)
    outgoingTransactions: TreasuryTransaction[];

    @OneToMany(() => TreasuryTransaction, (tx) => tx.destinationAccount)
    incomingTransactions: TreasuryTransaction[];
}
