import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiService } from '../ai/ai.service';
import { PromptType } from '../ai/prompt-registry.service';

import { ActionType, UsageService } from '../subscriptions/usage.service';
import { OrganicPost } from './entities/organic-post.entity';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class SocialService {
    private get fbGraphUrl() {
        const version = this.configService.get<string>('FACEBOOK_API_VERSION') || 'v19.0';
        return `https://graph.facebook.com/${version}`;
    }

    constructor(
        private configService: ConfigService,
        private aiService: AiService,
        private usageService: UsageService,
    ) { }

    getFacebookLoginUrl(companyId: string): string {
        const appId = this.configService.get<string>('FACEBOOK_APP_ID');
        const redirectUri = this.configService.get<string>('FACEBOOK_CALLBACK_URL');
        const version = this.configService.get<string>('FACEBOOK_API_VERSION') || 'v19.0';

        // Scope integral: Ads + Orgánico + WhatsApp + Pages
        const scopes = [
            'email',
            'public_profile',
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_show_list',
            'ads_management',
            'ads_read',
            'business_management',
            'whatsapp_business_management'
        ].join(',');

        return `https://www.facebook.com/${version}/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code&state=${companyId}`;
    }

    async exchangeCodeForToken(code: string) {
        const appId = this.configService.get<string>('FACEBOOK_APP_ID');
        const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
        const redirectUri = this.configService.get<string>('FACEBOOK_CALLBACK_URL');

        try {
            const response = await axios.get(`${this.fbGraphUrl}/oauth/access_token`, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    redirect_uri: redirectUri,
                    code: code,
                },
            });
            return response.data; // { access_token, token_type, expires_in }
        } catch (error) {
            console.error('Error exchanging code for token:', error.response?.data || error.message);
            throw new InternalServerErrorException('No se pudo obtener el token de acceso de Facebook.');
        }
    }

    async createPost(pageAccessToken: string, pageId: string, message: string) {
        try {
            const response = await axios.post(`${this.fbGraphUrl}/${pageId}/feed`, {
                message: message,
                access_token: pageAccessToken,
            });
            return response.data;
        } catch (error) {
            console.error('Error creating FB post:', error.response?.data || error.message);
            throw new InternalServerErrorException('No se pudo publicar en el muro de Facebook.');
        }
    }

    async generatePostContent(
        companyContext: string,
        companyId: string,
        options: { instructions?: string; tone?: string; length?: string } = {}
    ) {
        // 1. Verificar límite de edición/generación manual
        await this.usageService.checkLimit(companyId, ActionType.AI_EDIT);

        const content = await this.aiService.generateResponse(
            PromptType.SOCIAL_POST,
            {
                context: companyContext,
                instructions: options.instructions || 'Sin instrucciones adicionales',
                tone: options.tone || 'cercano y profesional',
                length: options.length || 'medio'
            },
            companyId
        );

        // 2. Registrar uso
        await this.usageService.recordUsage(companyId, ActionType.AI_EDIT);

        return content;
    }

    async publishPost(post: OrganicPost, company: Company) {
        if (post.platform === 'facebook') {
            await this.publishToFacebook(post, company);
        } else if (post.platform === 'instagram') {
            await this.publishToInstagram(post, company);
        } else {
            console.log(`Platform ${post.platform} auto-publishing not supported yet.`);
        }
    }

    private async publishToFacebook(post: OrganicPost, company: Company) {
        const pageId = company.fbPageId;
        const accessToken = company.fbPageAccessToken; // Or user token if page token not stored specifically

        if (!pageId || !accessToken) {
            throw new Error('Facebook Page ID or Access Token missing for company ' + company.id);
        }

        try {
            const body: any = {
                message: post.content,
                access_token: accessToken,
            };

            if (post.imageUrl) {
                // If there's an image, we should theoretically use /photos endpoint or attach link
                // For MVP simpler feed post with link if it's a URL, or photos endpoint if it's a file
                // Assuming imageUrl is a public URL:
                body.link = post.imageUrl;
            }

            const response = await axios.post(`${this.fbGraphUrl}/${pageId}/feed`, body);
            return response.data;
        } catch (error) {
            console.error('Error publishing to Facebook:', error.response?.data || error.message);
            throw new Error(`Failed to publish to Facebook: ${error.message}`);
        }
    }

    private async publishToInstagram(post: OrganicPost, company: Company) {
        if (!company.fbPageId || !company.metaToken) { // We need a token with instagram_content_publish
            throw new Error('Missing Page ID or Meta Token for Instagram link check.');
        }

        // 1. Get IG User ID linked to Page
        let igUserId = null;
        try {
            const pageRes = await axios.get(`${this.fbGraphUrl}/${company.fbPageId}`, {
                params: {
                    fields: 'instagram_business_account',
                    access_token: company.metaToken
                }
            });
            igUserId = pageRes.data.instagram_business_account?.id;
        } catch (e) {
            console.error('Error getting IG Account:', e.response?.data || e.message);
        }

        if (!igUserId) {
            throw new Error('No Instagram Business Account linked to this Facebook Page.');
        }

        // 2. Create Media Container
        if (!post.imageUrl) {
            throw new Error('Instagram requires an image URL.');
        }

        try {
            const containerRes = await axios.post(`${this.fbGraphUrl}/${igUserId}/media`, {
                image_url: post.imageUrl,
                caption: post.content,
                access_token: company.metaToken
            });

            const creationId = containerRes.data.id;

            // 3. Publish Media
            await axios.post(`${this.fbGraphUrl}/${igUserId}/media_publish`, {
                creation_id: creationId,
                access_token: company.metaToken
            });

        } catch (error) {
            console.error('Error publishing to Instagram:', error.response?.data || error.message);
            throw new Error(`Failed to publish to Instagram: ${error.message}`);
        }
    }

    async getPages(accessToken: string) {
        try {
            const response = await axios.get(`${this.fbGraphUrl}/me/accounts`, {
                params: {
                    access_token: accessToken,
                    fields: 'name,id,access_token,category',
                },
            });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching FB pages:', error.response?.data || error.message);
            throw new InternalServerErrorException('No se pudieron obtener las páginas de Facebook.');
        }
    }
    async handleCommentWebhook(body: any) {
        // This is a simplified webhook handler for MVP
        // In real Meta Webhooks, you verify signature, handle challenge, etc.
        // Assuming body structure matches Meta's 'feed' object for comments

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (value?.item !== 'comment' && value?.item !== 'post') return;
        if (value?.verb !== 'add') return; // Only reply to new comments

        const commentId = value.comment_id || value.post_id;
        const message = value.message;
        const senderId = value.from?.id;
        const pageId = value.post?.id?.split('_')[0] || entry.id; // Or however we get the page ID

        if (!message || !commentId) return;

        // Find company by Page ID
        // Note: We need a way to find company by fbPageId. 
        // For MVP, we might need to query all companies or index fbPageId.
        // Assuming we have a method or we can find it:
        const company = await this.usageService.findCompanyByPageId(pageId);

        if (!company) {
            console.log(`No company found for Page ID ${pageId}`);
            return;
        }

        // Generate AI Reply
        const reply = await this.aiService.generateResponse(
            PromptType.COMMENT_REPLY,
            {
                context: company.aiContext || `Industria: ${company.industry}`,
                objective: company.aiObjective || 'Fomentar interacción',
                constraints: company.aiConstraints || 'Ser amable',
                tone: company.aiTone || 'Profesional',
                comment: message,
                platform: 'Facebook/Instagram'
            },
            company.id
        );

        // Reply to comment
        await this.replyToComment(commentId, reply, company.fbPageAccessToken);
    }

    async replyToComment(commentId: string, message: string, accessToken: string) {
        try {
            await axios.post(`${this.fbGraphUrl}/${commentId}/comments`, {
                message: message,
                access_token: accessToken,
            });
        } catch (error) {
            console.error('Error replying to comment:', error.response?.data || error.message);
        }
    }
}
