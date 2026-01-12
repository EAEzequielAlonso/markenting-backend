import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompaniesService } from '../companies/companies.service';

@Controller('social')
export class SocialController {
    constructor(
        private readonly socialService: SocialService,
        private readonly companiesService: CompaniesService
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('auth/facebook')
    async facebookAuth(@Request() req) {
        return { url: this.socialService.getFacebookLoginUrl(req.user.companyId) };
    }

    @UseGuards(JwtAuthGuard)
    @Post('auth/facebook/confirm')
    async confirmFacebookAuth(@Request() req, @Body() body: { code: string }) {
        const tokenData = await this.socialService.exchangeCodeForToken(body.code);

        // Guardar el metaToken permanentemente en la empresa
        await this.companiesService.update(req.user.companyId, {
            metaToken: tokenData.access_token
        });

        return {
            message: "Token guardado correctamente",
            accessToken: tokenData.access_token
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('generate-post')
    async generatePost(
        @Request() req,
        @Body() body: { instructions?: string; tone?: string; length?: string }
    ) {
        const company = await this.companiesService.findOne(req.user.companyId);
        const context = `Industria: ${company.industry}, Productos: ${company.productsDescription}, Estrategia: ${company.strategySummary}`;
        return this.socialService.generatePostContent(context, company.id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Get('facebook/pages')
    async getAvailablePages(@Request() req) {
        const company = await this.companiesService.findOne(req.user.companyId);
        if (!company.metaToken) {
            throw new Error('Meta no está conectado.');
        }
        return this.socialService.getPages(company.metaToken);
    }

    @UseGuards(JwtAuthGuard)
    @Post('facebook/select-page')
    async selectPage(
        @Request() req,
        @Body() body: { pageId: string; pageAccessToken: string }
    ) {
        await this.companiesService.update(req.user.companyId, {
            fbPageId: body.pageId,
            fbPageAccessToken: body.pageAccessToken,
        });
        return { message: 'Página seleccionada correctamente' };
    }

    @UseGuards(JwtAuthGuard)
    @Post('publish')
    async publishPost(
        @Request() req,
        @Body() body: { message: string }
    ) {
        const company = await this.companiesService.findOne(req.user.companyId);

        if (!company.fbPageId || !company.fbPageAccessToken) {
            throw new Error('Para publicar realmente, primero debes conectar tu página en Configuración.');
        }

        return this.socialService.createPost(company.fbPageAccessToken, company.fbPageId, body.message);
    }

    @Get('auth/facebook/callback')
    async facebookCallback(@Query('code') code: string) {
        if (!code) throw new Error('No code provided');
        const tokenData = await this.socialService.exchangeCodeForToken(code);
        return {
            message: "Autenticación exitosa",
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in
        };
    }
    @Get('webhook')
    verifyWebhook(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
        if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
            return challenge;
        }
        throw new Error('Invalid token');
    }

    @Post('webhook')
    async handleWebhook(@Body() body: any) {
        // Handle asynchronously
        this.socialService.handleCommentWebhook(body);
        return { status: 'ok' };
    }
}
