import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import axios from 'axios';
import { AiService } from '../ai/ai.service';
import { PromptType } from '../ai/prompt-registry.service';
import { Company } from '../companies/entities/company.entity';
import { AdCampaign, AdCampaignStatus } from './entities/ad-campaign.entity';
import { AdDailyMetric } from './entities/ad-daily-metric.entity';
import { AdSuggestion, SuggestionType, SuggestionStatus } from './entities/ad-suggestion.entity';
import { UsageService, ActionType } from '../subscriptions/usage.service';

@Injectable()
export class AdsService {
    private readonly fbGraphUrl = 'https://graph.facebook.com/v19.0';
    // ... rest of constructor and methods

    constructor(
        @InjectRepository(AdCampaign)
        private adCampaignRepository: Repository<AdCampaign>,
        @InjectRepository(AdSuggestion)
        private adSuggestionRepository: Repository<AdSuggestion>,
        private configService: ConfigService,
        private aiService: AiService,
        private usageService: UsageService,
    ) { }

    async getAdAccounts(accessToken: string) {
        try {
            const response = await axios.get(`${this.fbGraphUrl}/me/adaccounts`, {
                params: {
                    access_token: accessToken,
                    fields: 'name,account_id,id,currency',
                },
            });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching ad accounts:', error.response?.data || error.message);
            throw new InternalServerErrorException('No se pudieron obtener las cuentas publicitarias.');
        }
    }

    async getPages(accessToken: string) {
        try {
            const response = await axios.get(`${this.fbGraphUrl}/me/accounts`, {
                params: {
                    access_token: accessToken,
                    fields: 'name,id,access_token,category,picture',
                },
            });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching Facebook Pages:', error.response?.data || error.message);
            throw new InternalServerErrorException('No se pudieron obtener las páginas de Facebook.');
        }
    }

    async getInsights(accessToken: string, adAccountId: string, options: { daily?: boolean } = {}) {
        try {
            const params: any = {
                access_token: accessToken,
                fields: 'impressions,clicks,spend,reach,ctr,cpc',
                date_preset: 'last_30d',
            };

            if (options.daily) {
                params.time_increment = 1;
            }

            const response = await axios.get(`${this.fbGraphUrl}/${adAccountId}/insights`, { params });

            if (options.daily) {
                return response.data.data || [];
            }

            return response.data.data?.[0] || { impressions: 0, clicks: 0, spend: 0, reach: 0, ctr: 0, cpc: 0 };
        } catch (error) {
            console.error('Error fetching Insights:', error.response?.data || error.message);
            return options.daily ? [] : { impressions: 0, clicks: 0, spend: 0, reach: 0, ctr: 0, cpc: 0, error: true };
        }
    }



    async findAll(companyId: string, filters: { name?: string; status?: string }) {
        const company = await this.adCampaignRepository.manager.findOne(Company, { where: { id: companyId } });

        const where: any = { company: { id: companyId } };
        if (filters.name) where.name = Like(`%${filters.name}%`);
        if (filters.status) where.status = filters.status;

        const dbCampaigns = await this.adCampaignRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });

        // Si tiene Meta configurado, intentar traer campañas reales de Meta
        if (company?.metaToken && company?.adAccountId) {
            try {
                const response = await axios.get(`${this.fbGraphUrl}/${company.adAccountId}/campaigns`, {
                    params: {
                        access_token: company.metaToken,
                        fields: 'name,status,objective,start_time,stop_time,id',
                    },
                });

                const metaCampaigns = response.data.data.map(mc => ({
                    id: mc.id,
                    name: mc.name,
                    status: mc.status === 'ACTIVE' ? AdCampaignStatus.ACTIVE : AdCampaignStatus.PAUSED,
                    objective: mc.objective,
                    platform: 'Meta',
                    isExternal: true,
                    dailyBudget: 0, // No está en la lista de campañas directamente, requiere insights diarios
                    spend: '$0.00',
                    clicks: '0',
                    impressions: '0',
                    ctr: '0.00%'
                }));

                // Combinar evitando duplicados si sincronizamos algún ID luego
                const externalOnly = metaCampaigns.filter(mc => !dbCampaigns.find(dbc => dbc.metaCampaignId === mc.id));
                return [...dbCampaigns, ...externalOnly];
            } catch (error) {
                console.error('Error fetching real campaigns from Meta:', error.response?.data || error.message);
                return dbCampaigns;
            }
        }

        return dbCampaigns;
    }

    async create(companyId: string, data: any, company: Company) {
        // 1. Verificar límites
        await this.usageService.checkLimit(companyId, ActionType.CREATE_CAMPAIGN);

        // 2. Generar Creatividad con IA
        const promptContext = `
            Negocio: ${company.name}
            Industria: ${company.industry}
            Objetivo Ads: ${data.objective}
            Producto/Oferta: ${data.productDescription} - ${data.offer}
            CTA: ${data.cta}
        `;

        const aiResponse = await this.aiService.generateResponse(
            PromptType.MEDIA_BUYER,
            { context: promptContext },
            companyId
        );

        // Parsear respuesta simple (esto depende de cómo responda el prompt registry)
        // Por ahora lo guardamos como copy principal
        const adCampaign = this.adCampaignRepository.create({
            ...data,
            company,
            aiCopy: aiResponse,
            status: AdCampaignStatus.ACTIVE,
        });

        const saved = (await this.adCampaignRepository.save(adCampaign)) as unknown as AdCampaign;

        // 3. Registrar uso
        await this.usageService.recordUsage(companyId, ActionType.CREATE_CAMPAIGN);

        // 4. Publicar en Meta si está configurado
        if (company.metaToken && company.adAccountId && data.autoPublish) {
            try {
                const metaResult = await this.publishToMeta(saved, company, data);
                saved.metaCampaignId = metaResult.campaignId;
                saved.status = AdCampaignStatus.ACTIVE;
                await this.adCampaignRepository.save(saved);
            } catch (error) {
                console.error('Error publishing to Meta:', error);
                // No fallamos toda la request, pero avisamos (o podríamos guardar un flag de error)
            }
        }

        return saved;
    }

    private async publishToMeta(campaign: AdCampaign, company: Company, data: any) {
        const adAccountUrl = `${this.fbGraphUrl}/${company.adAccountId}`;
        const token = company.metaToken;
        const pageId = company.fbPageId;

        // A. Crear Campaña
        const campRes = await axios.post(`${adAccountUrl}/campaigns`, {
            name: campaign.name,
            objective: this.mapObjective(campaign.objective),
            status: 'PAUSED', // Crear pausada por seguridad inicial
            special_ad_categories: [],
            access_token: token
        });
        const metaCampaignId = campRes.data.id;

        // B. Crear AdSet
        const pixelId = null; // Para MVP sin pixel por ahora
        const adSetRes = await axios.post(`${adAccountUrl}/adsets`, {
            name: `${campaign.name} - AdSet`,
            campaign_id: metaCampaignId,
            daily_budget: Math.round(campaign.dailyBudget * 100), // Centavos
            billing_event: 'IMPRESSIONS',
            optimization_goal: this.mapOptimizationGoal(campaign.objective),
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            start_time: new Date(new Date().getTime() + 10 * 60000).toISOString(), // +10 mins
            targeting: {
                geo_locations: { countries: ['AR'] }, // Default Argentina o tomar de company.location
                age_min: 18,
                age_max: 65,
                // gender: ... (mapped)
            },
            access_token: token
        });
        const adSetId = adSetRes.data.id;

        // C. Crear Creative
        // Necesitamos una imagen. Si no hay, usar placeholder o una de la librería.
        // Para MVP, asumo que data.imageUrl viene o usamos una dummy.
        const imageUrl = data.imageUrl || 'https://via.placeholder.com/1080x1080.png?text=Ad+Image';

        const creativeRes = await axios.post(`${adAccountUrl}/adcreatives`, {
            name: `${campaign.name} - Creative`,
            object_story_spec: {
                page_id: pageId,
                link_data: {
                    message: campaign.aiCopy,
                    link: company.domain || 'https://google.com',
                    caption: company.domain || 'google.com',
                    picture: imageUrl
                }
            },
            access_token: token
        });
        const creativeId = creativeRes.data.id;

        // D. Crear Anuncio
        const adRes = await axios.post(`${adAccountUrl}/ads`, {
            name: `${campaign.name} - Ad`,
            adset_id: adSetId,
            creative: { creative_id: creativeId },
            status: 'PAUSED',
            access_token: token
        });

        return { campaignId: metaCampaignId, adSetId, adId: adRes.data.id };
    }

    private mapObjective(obj: string): string {
        // Mapeo simplificado para MVP
        const map: any = {
            'TRAFFIC': 'OUTCOME_TRAFFIC',
            'AWARENESS': 'OUTCOME_AWARENESS',
            'SALES': 'OUTCOME_SALES',
            'LEADS': 'OUTCOME_LEADS'
        };
        return map[obj] || 'OUTCOME_TRAFFIC';
    }

    private mapOptimizationGoal(obj: string): string {
        const map: any = {
            'TRAFFIC': 'LINK_CLICKS',
            'AWARENESS': 'REACH',
            'SALES': 'OFFSITE_CONVERSIONS',
            'LEADS': 'LEADS'
        };
        return map[obj] || 'LINK_CLICKS';
    }

    async toggleStatus(id: string, companyId: string) {
        const campaign = await this.adCampaignRepository.findOne({
            where: { id, company: { id: companyId } },
            relations: ['company']
        });

        if (!campaign) throw new NotFoundException('Campaña no encontrada');

        const newStatus = campaign.status === AdCampaignStatus.ACTIVE
            ? AdCampaignStatus.PAUSED
            : AdCampaignStatus.ACTIVE;

        // Si tiene Meta ID, sincronizar con la API
        if (campaign.metaCampaignId && campaign.company.metaToken) {
            try {
                await axios.post(`${this.fbGraphUrl}/${campaign.metaCampaignId}`, null, {
                    params: {
                        access_token: campaign.company.metaToken,
                        status: newStatus === AdCampaignStatus.ACTIVE ? 'ACTIVE' : 'PAUSED',
                    },
                });
            } catch (error) {
                console.error('Error syncing status with Meta:', error.response?.data || error.message);
                // Opcional: lanzar error o marcar como "desincronizado"
            }
        }

        campaign.status = newStatus;
        return this.adCampaignRepository.save(campaign);
    }

    async delete(id: string, companyId: string) {
        const campaign = await this.adCampaignRepository.findOne({
            where: { id, company: { id: companyId } }
        });
        if (!campaign) throw new NotFoundException('Campaña no encontrada');

        // Soft delete/Archive
        campaign.status = AdCampaignStatus.ARCHIVED;
        return this.adCampaignRepository.save(campaign);
    }

    async generateAdContent(companyId: string, context: string) {
        return this.aiService.generateResponse(
            PromptType.MEDIA_BUYER,
            { context },
            companyId
        );
    }

    async syncDailyInsights(companyId: string): Promise<void> {
        const company = await this.adCampaignRepository.manager.findOne(Company, { where: { id: companyId } });
        if (!company?.metaToken || !company.adAccountId) return;

        const campaigns = await this.adCampaignRepository.find({
            where: { company: { id: companyId }, status: AdCampaignStatus.ACTIVE }
        });

        for (const campaign of campaigns) {
            if (!campaign.metaCampaignId) continue;

            try {
                const params = {
                    access_token: company.metaToken,
                    date_preset: 'yesterday', // Sincronizamos ayer para tener dato cerrado
                    fields: 'impressions,clicks,spend,reach,ctr,cpc'
                };

                const response = await axios.get(`${this.fbGraphUrl}/${campaign.metaCampaignId}/insights`, { params });
                const data = response.data.data?.[0];

                if (data) {
                    const metric = new AdDailyMetric();
                    metric.campaign = campaign;
                    metric.date = new Date().toISOString().split('T')[0]; // O la fecha de yesterday
                    metric.spend = parseFloat(data.spend || '0');
                    metric.impressions = parseInt(data.impressions || '0');
                    metric.clicks = parseInt(data.clicks || '0');
                    metric.ctr = parseFloat(data.ctr || '0');
                    metric.cpc = parseFloat(data.cpc || '0');

                    await this.adSuggestionRepository.manager.save(AdDailyMetric, metric);
                }
            } catch (error) {
                console.error(`Error syncing insights for campaign ${campaign.id}:`, error.message);
            }
        }
    }

    // ------------------------------------------------------------------
    // AI SUGGESTIONS LOGIC
    // ------------------------------------------------------------------

    async getSuggestions(companyId: string) {
        // En una implementación real, aquí correría el motor de análisis
        // Para MVP, llamamos a un generador simple "on demand" si no hay sugerencias recientes
        await this.generateRoutineSuggestions(companyId);

        return this.adSuggestionRepository.find({
            where: {
                company: { id: companyId },
                status: SuggestionStatus.PENDING
            },
            relations: ['campaign'],
            order: { createdAt: 'DESC' },
            take: 3
        });
    }

    async applySuggestion(id: string, companyId: string) {
        const suggestion = await this.adSuggestionRepository.findOne({
            where: { id, company: { id: companyId } },
            relations: ['campaign']
        });

        if (!suggestion) throw new NotFoundException('Sugerencia no encontrada');
        if (suggestion.status !== SuggestionStatus.PENDING) throw new BadRequestException('Sugerencia ya procesada');

        // Ejecutar acción
        if (suggestion.type === SuggestionType.PAUSE_CAMPAIGN && suggestion.campaign) {
            await this.toggleStatus(suggestion.campaign.id, companyId);
        } else if (suggestion.type === SuggestionType.CHANGE_COPY && suggestion.campaign && suggestion.data?.newCopy) {
            suggestion.campaign.aiCopy = suggestion.data.newCopy;
            await this.adCampaignRepository.save(suggestion.campaign);
        } else if (suggestion.type === SuggestionType.BUDGET_INCREASE && suggestion.campaign && suggestion.data?.newBudget) {
            suggestion.campaign.dailyBudget = suggestion.data.newBudget;
            await this.adCampaignRepository.save(suggestion.campaign);
        }

        suggestion.status = SuggestionStatus.APPLIED;
        return this.adSuggestionRepository.save(suggestion);
    }

    async ignoreSuggestion(id: string, companyId: string) {
        const suggestion = await this.adSuggestionRepository.findOne({
            where: { id, company: { id: companyId } }
        });
        if (!suggestion) throw new NotFoundException('Sugerencia no encontrada');

        suggestion.status = SuggestionStatus.IGNORED;
        return this.adSuggestionRepository.save(suggestion);
    }

    private async generateRoutineSuggestions(companyId: string) {
        const company = await this.adCampaignRepository.manager.findOne(Company, { where: { id: companyId } });
        if (!company) return;

        // Lógica heurística simpe para MVP
        const campaigns = await this.adCampaignRepository.find({
            where: { company: { id: companyId }, status: AdCampaignStatus.ACTIVE }
        });

        if (campaigns.length === 0) {
            // Sugerencia de bienvenida si no hay campañas
            const existingGeneral = await this.adSuggestionRepository.findOne({
                where: {
                    company: { id: companyId },
                    campaign: IsNull(),
                    type: SuggestionType.PERFORMANCE_CHECK,
                    status: SuggestionStatus.PENDING
                }
            });

            if (!existingGeneral) {
                const welcome = this.adSuggestionRepository.create({
                    company,
                    type: SuggestionType.PERFORMANCE_CHECK,
                    message: "¡Bienvenido al asistente de Ads!",
                    reasoning: "Estoy listo para analizar tus campañas. Crea tu primera campaña con IA para que pueda empezar a sugerirte mejoras de rendimiento.",
                    status: SuggestionStatus.PENDING,
                    data: { action: 'CREATE_FIRST' }
                });
                await this.adSuggestionRepository.save(welcome);
            }
            return;
        }

        for (const campaign of campaigns) {
            // Regla 1: Si lleva más de 3 días y el presupuesto es bajo, sugerir aumento
            const daysActive = (new Date().getTime() - campaign.createdAt.getTime()) / (1000 * 3600 * 24);

            // Check if suggestion already exists to avoid dupes
            const existing = await this.adSuggestionRepository.findOne({
                where: {
                    campaign: { id: campaign.id },
                    type: SuggestionType.BUDGET_INCREASE,
                    status: SuggestionStatus.PENDING
                }
            });

            if (daysActive > 3 && campaign.dailyBudget < 10 && !existing) {
                const suggestion = this.adSuggestionRepository.create({
                    company,
                    campaign,
                    type: SuggestionType.BUDGET_INCREASE,
                    message: `Tu campaña "${campaign.name}" tiene buen potencial pero poco presupuesto.`,
                    reasoning: 'Con 3 días de actividad, aumentar el presupuesto puede acelerar el aprendizaje del algoritmo.',
                    data: { newBudget: campaign.dailyBudget * 1.5 },
                    status: SuggestionStatus.PENDING
                });
                await this.adSuggestionRepository.save(suggestion);
            }

            // Regla 2: Mock de "Fatiga de anuncio" aleatoria para demo
            if (Math.random() > 0.7) { // 30% chance
                const existingCopy = await this.adSuggestionRepository.findOne({
                    where: { campaign: { id: campaign.id }, type: SuggestionType.CHANGE_COPY, status: SuggestionStatus.PENDING }
                });

                if (!existingCopy) {
                    const suggestion = this.adSuggestionRepository.create({
                        company,
                        campaign,
                        type: SuggestionType.CHANGE_COPY,
                        message: `El rendimiento de "${campaign.name}" parece estancado.`,
                        reasoning: 'La audiencia podría estar cansada de ver el mismo texto. Prueba esta variación.',
                        data: { newCopy: campaign.aiCopy + " (Variación Fresca)" },
                        status: SuggestionStatus.PENDING
                    });
                    await this.adSuggestionRepository.save(suggestion);
                }
            }
        }
    }
}
