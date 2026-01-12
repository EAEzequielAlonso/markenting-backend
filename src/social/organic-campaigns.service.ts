import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganicCampaign, OrganicCampaignStatus } from './entities/organic-campaign.entity';
import { OrganicPost, OrganicPostStatus } from './entities/organic-post.entity';
import { AiService } from '../ai/ai.service';
import { PromptType } from '../ai/prompt-registry.service';
import { Company } from '../companies/entities/company.entity';
import { ActionType, UsageService } from '../subscriptions/usage.service';

@Injectable()
export class OrganicCampaignsService {
    constructor(
        @InjectRepository(OrganicCampaign)
        private campaignRepository: Repository<OrganicCampaign>,
        @InjectRepository(OrganicPost)
        private postRepository: Repository<OrganicPost>,
        @InjectRepository(Company)
        private companyRepository: Repository<Company>,
        private aiService: AiService,
        private usageService: UsageService,
    ) { }

    async create(companyId: string, data: any): Promise<OrganicCampaign> {
        // 1. Verificar límites de campaña por plan
        await this.usageService.checkLimit(companyId, ActionType.CREATE_CAMPAIGN);

        const company = await this.companyRepository.findOne({ where: { id: companyId } });
        if (!company) throw new NotFoundException('Empresa no encontrada');

        const campaign = this.campaignRepository.create({
            ...data,
            company,
            status: OrganicCampaignStatus.ACTIVE,
        });

        const savedCampaign = await this.campaignRepository.save(campaign) as any;

        // 2. Registrar creación de campaña
        await this.usageService.recordUsage(companyId, ActionType.CREATE_CAMPAIGN);

        // Gatillar la generación inicial de posts por la IA
        // Usamos setImmediate para no bloquear el return de la creación básica
        setImmediate(() => {
            this.generatePostsForCampaign(savedCampaign as OrganicCampaign, company).catch(err => {
                console.error('[OrganicCampaignsService] Async post generation failed:', err);
            });
        });

        return savedCampaign as OrganicCampaign;
    }

    async generatePostsForCampaign(campaign: OrganicCampaign, company: Company) {
        const platforms = ['facebook', 'instagram', 'whatsapp'];
        const duration = campaign.durationDays || 7;
        const postsPerDay = campaign.postsPerDay || 3;
        const totalPosts = duration * postsPerDay;

        console.log(`[OrganicCampaignsService] Generating ${totalPosts} organic posts for campaign ${campaign.id}`);

        for (let i = 0; i < totalPosts; i++) {
            const platform = platforms[i % platforms.length];
            const scheduledFor = new Date();
            scheduledFor.setDate(scheduledFor.getDate() + Math.floor(i / platforms.length));
            scheduledFor.setHours(9 + (i % 12), 0, 0, 0); // Horario laboral variado

            try {
                // Verificar límite de posts por campaña (el contexto i es el número de post actual)
                await this.usageService.checkLimit(company.id, ActionType.GENERATE_POST, i);

                const content = await this.aiService.generateResponse(
                    PromptType.ORGANIC_CAMPAIGN,
                    {
                        businessName: company.name,
                        businessType: campaign.businessType || 'local',
                        industry: company.industry || 'General',
                        location: company.location || 'Local',
                        objective: campaign.objective || 'Atraer clientes',
                        products: campaign.products || '',
                        offers: campaign.offers || '',
                        couponCode: campaign.couponCode || 'N/A',
                        whatsappNumber: campaign.whatsappNumber || '',
                        dailyPromos: campaign.dailyPromos || '',
                        dayOfWeek: scheduledFor.toLocaleDateString('es-ES', { weekday: 'long' }),
                        platform: platform
                    },
                    company.id
                );

                const post = this.postRepository.create({
                    content,
                    platform,
                    scheduledFor,
                    campaign: campaign,
                    status: OrganicPostStatus.PLANNED
                });

                await this.postRepository.save(post);

                // Registrar uso de generación de post (descuenta créditos internos)
                await this.usageService.recordUsage(company.id, ActionType.GENERATE_POST);
            } catch (error) {
                console.error(`[OrganicCampaignsService] Error generating post ${i} on ${platform}:`, error.message);
            }
        }
    }

    async findAllByCompany(companyId: string): Promise<OrganicCampaign[]> {
        return this.campaignRepository.find({
            where: { company: { id: companyId } },
            relations: ['posts'],
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string): Promise<any> {
        const campaign = await this.campaignRepository.findOne({
            where: { id },
            relations: ['posts', 'company']
        });
        if (!campaign) throw new NotFoundException('Campaña no encontrada');
        return campaign;
    }

    async regeneratePost(postId: string, companyId: string): Promise<OrganicPost> {
        const post = await this.postRepository.findOne({
            where: { id: postId },
            relations: ['campaign', 'campaign.company']
        });

        if (!post) throw new NotFoundException('Post no encontrado');
        if (post.campaign.company.id !== companyId) throw new ForbiddenException('No tienes permiso');

        // 1. Verificar límites de regeneración
        await this.usageService.checkLimit(companyId, ActionType.REGENERATE_POST, post.regenerationCount);

        // 2. Generar nuevo contenido
        const campaign = post.campaign;
        const company = campaign.company;

        const content = await this.aiService.generateResponse(
            PromptType.ORGANIC_CAMPAIGN,
            {
                businessName: company.name,
                businessType: campaign.businessType || 'local',
                industry: company.industry || 'General',
                location: company.location || 'Local',
                objective: campaign.objective || 'Atraer clientes',
                products: campaign.products || '',
                offers: campaign.offers || '',
                couponCode: campaign.couponCode || 'N/A',
                whatsappNumber: campaign.whatsappNumber || '',
                platform: post.platform,
                isRegeneration: 'true'
            },
            companyId
        );

        // 3. Actualizar post
        post.content = content;
        post.regenerationCount += 1;
        post.status = OrganicPostStatus.PLANNED;

        const savedPost = await this.postRepository.save(post);

        // 4. Registrar uso
        await this.usageService.recordUsage(companyId, ActionType.REGENERATE_POST);

        return savedPost;
    }
}
