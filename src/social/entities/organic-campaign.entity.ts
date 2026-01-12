import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { OrganicPost } from './organic-post.entity';

export enum OrganicCampaignStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    DRAFT = 'DRAFT'
}

@Entity('organic_campaigns')
export class OrganicCampaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    objective: string;

    @Column('text', { nullable: true })
    products: string;

    @Column('text', { nullable: true })
    offers: string;

    @Column({ nullable: true })
    couponCode: string;

    @Column({ default: 'local' })
    businessType: string; // 'local' | 'online'

    @Column({ nullable: true })
    whatsappNumber: string;

    @Column({ default: 7 })
    durationDays: number;

    @Column({ default: 3 })
    postsPerDay: number;

    @Column('simple-array', { nullable: true })
    images: string[];

    @Column({
        type: 'enum',
        enum: OrganicCampaignStatus,
        default: OrganicCampaignStatus.ACTIVE
    })
    status: OrganicCampaignStatus;

    @ManyToOne(() => Company)
    company: Company;

    @OneToMany(() => OrganicPost, (post) => post.campaign)
    posts: OrganicPost[];

    @Column({ default: false })
    isLegacy: boolean;

    @Column({ type: 'text', nullable: true })
    dailyPromos: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
