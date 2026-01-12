import { Injectable } from '@nestjs/common';
import { AdsService } from '../ads/ads.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AiService } from '../ai/ai.service';
import { PromptType } from '../ai/prompt-registry.service';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class AnalyticsService {
    constructor(
        private adsService: AdsService,
        private whatsappService: WhatsappService,
        private aiService: AiService,
        private companiesService: CompaniesService,
    ) { }

    async getFullReport(companyId: string) {
        const company = await this.companiesService.findOne(companyId);

        // 1. Obtener métricas de Ads (General y Diario)
        const hasAds = company.adAccountId && company.metaToken;
        const adsInsights = hasAds
            ? await this.adsService.getInsights(company.metaToken, company.adAccountId)
            : { impressions: 0, clicks: 0, spend: 0, reach: 0, ctr: 0, cpc: 0 };

        const adsDaily = hasAds
            ? await this.adsService.getInsights(company.metaToken, company.adAccountId, { daily: true })
            : [];

        // 2. Obtener métricas de WhatsApp (Leads)
        const leads = await this.whatsappService.getLeadsByCompany(companyId);
        const totalLeads = leads.length;
        const interestedLeads = leads.filter(l => l.status === 'INTERESTED' || l.status === 'READY_TO_CLOSE').length;

        // 3. Generar Insights con IA (Agente Analista)
        const context = `
      Nombre Empresa: ${company.name}
      Métricas Meta Ads (30d): Impresiones: ${adsInsights.impressions}, Clicks: ${adsInsights.clicks}, Gasto: ${adsInsights.spend} USD.
      Métricas WhatsApp: Total Leads: ${totalLeads}, Leads Interesados: ${interestedLeads}.
    `;

        let aiAnalysis = "Analizando tus datos para generar recomendaciones...";
        try {
            aiAnalysis = await this.aiService.generateResponse(
                PromptType.ANALYST,
                { context },
                companyId
            );
        } catch (error) {
            console.error('[AnalyticsService] AI analysis failed:', error.message);
            aiAnalysis = "La IA está descansando o no tienes créditos suficientes para el análisis detallado. ¡Tus métricas siguen aquí!";
        }

        return {
            ads: adsInsights,
            adsDaily,
            whatsapp: {
                totalLeads,
                interestedLeads,
                conversionRate: totalLeads > 0 ? (interestedLeads / totalLeads) * 100 : 0
            },
            aiAnalysis
        };
    }
}
