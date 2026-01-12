import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';

@Entity('ad_daily_metrics')
@Unique(['campaign', 'date'])
export class AdDailyMetric {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => AdCampaign, (campaign) => campaign.id)
    campaign: AdCampaign;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    spend: number;

    @Column({ type: 'int', default: 0 })
    impressions: number;

    @Column({ type: 'int', default: 0 })
    clicks: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    ctr: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    cpc: number;

    @CreateDateColumn()
    createdAt: Date;
}
