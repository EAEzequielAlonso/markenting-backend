import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiActivity, AiActivityType } from './entities/ai-activity.entity';
import { AdSuggestion, SuggestionStatus } from '../ads/entities/ad-suggestion.entity';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class IntelligenceService {
    constructor(
        @InjectRepository(AiActivity)
        private activityRepo: Repository<AiActivity>,
        @InjectRepository(AdSuggestion) // Using AdSuggestion as the unified suggestion entity
        private suggestionRepo: Repository<AdSuggestion>,
        @InjectRepository(Company)
        private companyRepo: Repository<Company>,
    ) { }

    async logActivity(companyId: string, message: string, type: AiActivityType = AiActivityType.INFO, details?: any) {
        const company = await this.companyRepo.findOne({ where: { id: companyId } });
        if (!company) return;

        const activity = this.activityRepo.create({
            company,
            message,
            type,
            details: details ? JSON.stringify(details) : undefined,
            agentName: 'Sistema Inteligente'
        });

        return this.activityRepo.save(activity);
    }

    async getRecentActivity(companyId: string, limit: number = 10) {
        return this.activityRepo.find({
            where: { company: { id: companyId } },
            order: { createdAt: 'DESC' },
            take: limit
        });
    }

    async getUnifiedSuggestions(companyId: string) {
        return this.suggestionRepo.find({
            where: {
                company: { id: companyId },
                status: SuggestionStatus.PENDING
            },
            relations: ['campaign', 'organicCampaign'],
            order: { createdAt: 'DESC' }
        });
    }
}
