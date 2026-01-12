import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus, SubscriptionPlan } from './entities/subscription.entity';
import { Company } from '../companies/entities/company.entity';
import { PLAN_CREDITS_LIMITS } from './plan-limits';

@Injectable()
export class SubscriptionsService {
    constructor(
        @InjectRepository(Subscription)
        private subscriptionRepository: Repository<Subscription>,
        @InjectRepository(Company)
        private companyRepository: Repository<Company>,
    ) { }

    async createTrial(companyId: string): Promise<Subscription> {
        const company = await this.companyRepository.findOne({ where: { id: companyId }, relations: ['subscription'] });
        if (!company) throw new NotFoundException('Company not found');
        if (company.subscription) return company.subscription;

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7); // 7 days as requested

        const subscription = this.subscriptionRepository.create({
            company,
            plan: SubscriptionPlan.TRIAL,
            status: SubscriptionStatus.TRIALING,
            currentPeriodEnd: trialEnd,
        });

        const savedSubscription = await this.subscriptionRepository.save(subscription);

        // Actualizar créditos de la empresa basándose en el plan TRIAL
        await this.companyRepository.update(companyId, {
            credits: PLAN_CREDITS_LIMITS[SubscriptionPlan.TRIAL],
            plan: 'TRIAL',
        });

        return savedSubscription;
    }

    async findByCompany(companyId: string): Promise<Subscription> {
        const sub = await this.subscriptionRepository.findOne({
            where: { company: { id: companyId } },
        });
        if (!sub) throw new NotFoundException('Subscription not found');
        return sub;
    }

    async updateStatus(id: string, status: SubscriptionStatus, periodEnd?: Date): Promise<Subscription> {
        const sub = await this.subscriptionRepository.findOne({ where: { id } });
        if (!sub) throw new NotFoundException('Subscription not found');

        sub.status = status;
        if (periodEnd) sub.currentPeriodEnd = periodEnd;

        return this.subscriptionRepository.save(sub);
    }

    async activatePlan(companyId: string, plan: SubscriptionPlan): Promise<void> {
        const company = await this.companyRepository.findOne({ where: { id: companyId }, relations: ['subscription'] });
        if (!company) throw new NotFoundException('Company not found');

        // 1. Actualizar o crear suscripción
        let subscription = company.subscription;
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        if (!subscription) {
            subscription = this.subscriptionRepository.create({
                company,
                plan: plan,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodEnd: periodEnd,
            });
        } else {
            subscription.plan = plan;
            subscription.status = SubscriptionStatus.ACTIVE;
            subscription.currentPeriodEnd = periodEnd;
        }
        await this.subscriptionRepository.save(subscription);

        // 2. Actualizar créditos y plan en la empresa
        const credits = PLAN_CREDITS_LIMITS[plan] || 0;
        await this.companyRepository.update(companyId, {
            plan: plan,
            credits: () => `credits + ${credits}`, // Add credits instead of replacing? Or replace? 
            // In SaaS usually tokens reset monthly, but here we can add them.
            // Let's replace for now to simplify reset logic.
        });

        // If we want to replace:
        await this.companyRepository.update(companyId, {
            credits: credits,
        });

        console.log(`[Subscription] Plan ${plan} activated for company ${companyId}. Credits: ${credits}`);
    }
}
