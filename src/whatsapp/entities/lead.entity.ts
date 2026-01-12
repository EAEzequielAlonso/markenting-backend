import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum LeadStatus {
    COLD = 'COLD',
    INTERESTED = 'INTERESTED',
    READY_TO_CLOSE = 'READY_TO_CLOSE',
    CLOSED = 'CLOSED',
}

@Entity('leads')
export class Lead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    phoneNumber: string;

    @Column({ nullable: true })
    name: string;

    @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.COLD })
    status: LeadStatus;

    @Column({ type: 'jsonb', default: [] })
    conversationHistory: { role: 'user' | 'assistant', content: string, timestamp: Date }[];

    @Column({ type: 'text', nullable: true })
    aiSummary: string;

    @ManyToOne(() => Company)
    company: Company;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
