import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionPlan } from './entities/subscription.entity';
import { Company } from '../companies/entities/company.entity';
import { PLAN_LIMITS, ACTION_COSTS } from './plan-limits';

export enum ActionType {
    CREATE_CAMPAIGN = 'CREATE_CAMPAIGN',
    GENERATE_POST = 'GENERATE_POST',
    REGENERATE_POST = 'REGENERATE_POST',
    AI_EDIT = 'AI_EDIT',
}

@Injectable()
export class UsageService {
    constructor(
        @InjectRepository(Subscription)
        private subscriptionRepository: Repository<Subscription>,
        @InjectRepository(Company)
        private companyRepository: Repository<Company>,
    ) { }

    async checkLimit(companyId: string, action: ActionType, context?: any): Promise<boolean> {
        const company = await this.companyRepository.findOne({
            where: { id: companyId },
            relations: ['subscription']
        });

        if (!company) throw new NotFoundException('Empresa no encontrada');

        const sub = company.subscription;
        if (!sub) throw new ForbiddenException('No tienes una suscripción activa');

        const limits = PLAN_LIMITS[sub.plan];

        // 1. Verificar créditos internos (salvaguarda de rentabilidad)
        if (company.credits < 50) { // Mínimo para cualquier acción
            throw new ForbiddenException('Has agotado el potencial de IA de tu plan para este periodo.');
        }

        switch (action) {
            case ActionType.CREATE_CAMPAIGN:
                if (sub.monthlyCampaignsCreated >= limits.maxCampaignsPerMonth) {
                    throw new ForbiddenException(`Has alcanzado el límite de ${limits.maxCampaignsPerMonth} campañas por mes de tu plan.`);
                }
                break;

            case ActionType.GENERATE_POST:
                // El límite de posts es por campaña. context debe ser el count actual.
                if (context >= limits.maxPostsPerCampaign) {
                    throw new ForbiddenException(`Esta campaña ya alcanzó el máximo de ${limits.maxPostsPerCampaign} posts permitidos.`);
                }
                break;

            case ActionType.REGENERATE_POST:
                if (!limits.maxRegenerationsPerPost) {
                    throw new ForbiddenException(`Tu plan no permite regeneraciones. Actualiza para habilitar esta función.`);
                }
                // context debe ser el count de regeneraciones del post actual
                if (context >= limits.maxRegenerationsPerPost) {
                    throw new ForbiddenException(`Has alcanzado el límite de ${limits.maxRegenerationsPerPost} regeneraciones para este contenido.`);
                }
                break;

            case ActionType.AI_EDIT:
                if (!limits.canUseAiEditor) {
                    throw new ForbiddenException(`Tu plan no incluye el editor asistido por IA.`);
                }
                if (sub.monthlyAiEditsUsed >= limits.maxAiEditsPerMonth) {
                    throw new ForbiddenException(`Has alcanzado el límite de ${limits.maxAiEditsPerMonth} ediciones IA por mes.`);
                }
                break;
        }

        return true;
    }

    async recordUsage(companyId: string, action: ActionType, cost: number = 0): Promise<void> {
        const company = await this.companyRepository.findOne({
            where: { id: companyId },
            relations: ['subscription']
        });

        if (!company || !company.subscription) return;

        const sub = company.subscription;
        const internalCost = cost || this.getInternalCost(action);

        // Descontar créditos internos
        await this.companyRepository.decrement({ id: companyId }, 'credits', internalCost);
        await this.companyRepository.increment({ id: companyId }, 'aiCreditsUsed', internalCost);

        // Incrementar contadores funcionales en la suscripción
        if (action === ActionType.CREATE_CAMPAIGN) {
            await this.subscriptionRepository.increment({ id: sub.id }, 'monthlyCampaignsCreated', 1);
        } else if (action === ActionType.AI_EDIT) {
            await this.subscriptionRepository.increment({ id: sub.id }, 'monthlyAiEditsUsed', 1);
        }
    }

    private getInternalCost(action: ActionType): number {
        switch (action) {
            case ActionType.CREATE_CAMPAIGN: return 0; // Se cobra por post
            case ActionType.GENERATE_POST: return ACTION_COSTS.GENERATE_POST;
            case ActionType.REGENERATE_POST: return ACTION_COSTS.REGENERATE_POST;
            case ActionType.AI_EDIT: return ACTION_COSTS.AI_EDIT;
            default: return 100;
        }
    }
    async findCompanyByPageId(fbPageId: string): Promise<Company | null> {
        return this.companyRepository.findOne({ where: { fbPageId } });
    }
}
