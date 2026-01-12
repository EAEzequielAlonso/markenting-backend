import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Church } from './church.entity';
import { TransactionType } from './enums';

@Entity('treasury_transactions')
export class TreasuryTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, (church) => church.transactions)
    church: Church;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column('decimal')
    amount: number;

    @Column()
    description: string;

    @Column()
    date: Date;

    @Column()
    category: string;
}
