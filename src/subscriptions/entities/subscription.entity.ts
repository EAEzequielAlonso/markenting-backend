import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum SubscriptionStatus {
    TRIALING = 'TRIALING',
    ACTIVE = 'ACTIVE',
    PAST_DUE = 'PAST_DUE',
    CANCELED = 'CANCELED',
    INCOMPLETE = 'INCOMPLETE',
}

export enum SubscriptionPlan {
    TRIAL = 'TRIAL',
    PRO = 'PRO',
    BUSINESS = 'BUSINESS',
}

@Entity('subscriptions')
export class Subscription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => Company, (company) => company.subscription)
    @JoinColumn()
    company: Company;

    @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.TRIAL })
    plan: SubscriptionPlan;

    @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIALING })
    status: SubscriptionStatus;

    @Column({ nullable: true })
    stripeSubscriptionId: string;

    @Column({ nullable: true })
    mercadoPagoPreapprovalId: string;

    @Column({ nullable: true })
    stripeCustomerId: string;

    @Column({ type: 'timestamp', nullable: true })
    currentPeriodEnd: Date;

    @Column({ default: false })
    cancelAtPeriodEnd: boolean;

    @Column({ default: 0 })
    monthlyCampaignsCreated: number;

    @Column({ default: 0 })
    monthlyAiEditsUsed: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
