import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum AdCampaignStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    DRAFT = 'DRAFT',
    ARCHIVED = 'ARCHIVED'
}

@Entity('ad_campaigns')
export class AdCampaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    objective: string; // TRAFFIC, MESSAGES, CONVERSIONS, AWARENESS

    @Column({ type: 'text', nullable: true })
    productDescription: string;

    @Column({ nullable: true })
    offer: string;

    @Column({ nullable: true })
    couponCode: string;

    @Column({ default: 'LEARN_MORE' })
    cta: string;

    @Column({ nullable: true })
    location: string;

    @Column({ type: 'int', nullable: true })
    targetRadius: number;

    @Column({ nullable: true })
    ageRange: string;

    @Column({ nullable: true })
    gender: string;

    @Column({ type: 'text', nullable: true })
    interests: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    dailyBudget: number;

    @Column({ type: 'int' })
    durationDays: number;

    @Column({ type: 'text', nullable: true })
    aiCopy: string;

    @Column({ nullable: true })
    aiHeadline: string;

    @Column({ type: 'text', nullable: true })
    aiDescription: string;

    @Column({ nullable: true })
    metaCampaignId: string;

    @Column({
        type: 'enum',
        enum: AdCampaignStatus,
        default: AdCampaignStatus.ACTIVE,
    })
    status: AdCampaignStatus;

    @ManyToOne(() => Company, (company) => company.id)
    company: Company;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
