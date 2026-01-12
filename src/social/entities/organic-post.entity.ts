import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrganicCampaign } from './organic-campaign.entity';

export enum OrganicPostStatus {
    PLANNED = 'PLANNED',
    PUBLISHED = 'PUBLISHED',
    FAILED = 'FAILED'
}

@Entity('organic_posts')
export class OrganicPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    content: string;

    @Column()
    platform: string; // 'facebook' | 'instagram' | 'whatsapp'

    @Column({ type: 'timestamp' })
    scheduledFor: Date;

    @Column({ type: 'timestamp', nullable: true })
    publishedAt: Date;

    @Column({ nullable: true })
    imageUrl: string;

    @Column({
        type: 'enum',
        enum: OrganicPostStatus,
        default: OrganicPostStatus.PLANNED
    })
    status: OrganicPostStatus;

    @Column('jsonb', { nullable: true })
    metrics: any; // { interactions: number, clicks: number, etc }

    @Column({ default: 0 })
    regenerationCount: number;

    @ManyToOne(() => OrganicCampaign, (campaign) => campaign.posts)
    campaign: OrganicCampaign;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
