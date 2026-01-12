import { SubscriptionPlan } from './entities/subscription.entity';

/**
 * Costos internos en "créditos" para seguimiento de rentabilidad (no visibles al usuario)
 */
export const ACTION_COSTS = {
    GENERATE_POST: 150,
    REGENERATE_POST: 250,
    AI_EDIT: 100,
    FREE_PROMPT: 200,
};

export interface PlanLimits {
    maxCampaignsPerMonth: number;
    maxPostsPerCampaign: number;
    maxRegenerationsPerPost: number;
    maxAiEditsPerMonth: number;
    canUseAiEditor: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
    [SubscriptionPlan.TRIAL]: {
        maxCampaignsPerMonth: 1,
        maxPostsPerCampaign: 9,
        maxRegenerationsPerPost: 0,
        maxAiEditsPerMonth: 0,
        canUseAiEditor: false,
    },
    [SubscriptionPlan.PRO]: {
        maxCampaignsPerMonth: 4,
        maxPostsPerCampaign: 12,
        maxRegenerationsPerPost: 1,
        maxAiEditsPerMonth: 10,
        canUseAiEditor: true,
    },
    [SubscriptionPlan.BUSINESS]: {
        maxCampaignsPerMonth: 12, // Ahora limitado para evitar abusos
        maxPostsPerCampaign: 15,
        maxRegenerationsPerPost: 2,
        maxAiEditsPerMonth: 50,
        canUseAiEditor: true,
    },
};

/**
 * Mantenemos esto por compatibilidad legacy con el sistema de créditos actual,
 * pero el enforcement real será por PLAN_LIMITS.
 */
export const PLAN_CREDITS_LIMITS: Record<SubscriptionPlan, number> = {
    [SubscriptionPlan.TRIAL]: 3000,
    [SubscriptionPlan.PRO]: 60000,
    [SubscriptionPlan.BUSINESS]: 200000,
};
