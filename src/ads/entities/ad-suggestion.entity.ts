import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';
import { Company } from '../../companies/entities/company.entity';
import { OrganicCampaign } from '../../social/entities/organic-campaign.entity';

export enum SuggestionType {
    // ADS
    BUDGET_INCREASE = 'BUDGET_INCREASE',
    PAUSE_CAMPAIGN = 'PAUSE_CAMPAIGN',
    CHANGE_COPY = 'CHANGE_COPY',
    PERFORMANCE_CHECK = 'PERFORMANCE_CHECK',

    // ORGANIC
    POST_OPTIMIZATION = 'POST_OPTIMIZATION',
    SCHEDULE_POST = 'SCHEDULE_POST',
    CONTENT_IDEA = 'CONTENT_IDEA'
}

export enum SuggestionCategory {
    ADS = 'ADS',
    ORGANIC = 'ORGANIC'
}

export enum SuggestionStatus {
    PENDING = 'PENDING',
    APPLIED = 'APPLIED',
    IGNORED = 'IGNORED',
    AUTO_APPLIED = 'AUTO_APPLIED'
}

@Entity('ad_suggestions')
export class AdSuggestion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Company)
    company: Company;

    @ManyToOne(() => AdCampaign, { nullable: true })
    campaign: AdCampaign;

    @ManyToOne(() => OrganicCampaign, { nullable: true })
    organicCampaign: OrganicCampaign;

    @Column({
        type: 'enum',
        enum: SuggestionCategory,
        default: SuggestionCategory.ADS
    })
    category: SuggestionCategory;

    @Column({
        type: 'enum',
        enum: SuggestionType
    })
    type: SuggestionType;

    @Column()
    message: string;

    @Column()
    reasoning: string;

    @Column({
        type: 'enum',
        enum: SuggestionStatus,
        default: SuggestionStatus.PENDING
    })
    status: SuggestionStatus;

    @Column({ default: false })
    isAutomated: boolean; // Si true, puede aplicarse sin intervención si el setting lo permite (solo organic)

    @Column({ type: 'simple-json', nullable: true })
    data: any;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
