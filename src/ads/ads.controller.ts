import { Controller, Get, Post, Patch, Delete, Param, UseGuards, Request, Body } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompaniesService } from '../companies/companies.service';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
    constructor(
        private readonly adsService: AdsService,
        private readonly companiesService: CompaniesService,
    ) { }

    @Get('ad-accounts')
    async getAdAccounts(@Request() req) {
        const company = await this.companiesService.findOne(req.user.companyId);
        return this.adsService.getAdAccounts(company.metaToken);
    }

    @Get('pages')
    async getPages(@Request() req) {
        const company = await this.companiesService.findOne(req.user.companyId);
        return this.adsService.getPages(company.metaToken);
    }

    @Get('campaigns')
    async getCampaigns(@Request() req) {
        return this.adsService.findAll(req.user.companyId, req.query);
    }

    @Post('campaigns')
    async createCampaign(@Request() req, @Body() data: any) {
        const company = await this.companiesService.findOne(req.user.companyId);
        return this.adsService.create(req.user.companyId, data, company);
    }

    @Patch('campaigns/:id/status')
    async toggleStatus(@Request() req, @Param('id') id: string) {
        return this.adsService.toggleStatus(id, req.user.companyId);
    }

    @Delete('campaigns/:id')
    async deleteCampaign(@Request() req, @Param('id') id: string) {
        return this.adsService.delete(id, req.user.companyId);
    }

    @Post('generate-proposal')
    async generateProposal(@Request() req, @Body() data: any) {
        const company = await this.companiesService.findOne(req.user.companyId);
        // Reutilizamos la lógica de generación pero sin guardar aún
        const promptContext = `
            Negocio: ${company.name}
            Industria: ${company.industry}
            Objetivo Ads: ${data.objective || 'MESSAGES'}
            Producto/Oferta: ${data.productDescription || ''}
            CTA: ${data.cta || 'LEARN_MORE'}
        `;

        const proposal = await this.adsService.generateAdContent(req.user.companyId, promptContext);
        return { proposal };
    }

    // SUGGESTIONS ENDPOINTS

    @Get('suggestions')
    async getSuggestions(@Request() req) {
        return this.adsService.getSuggestions(req.user.companyId);
    }

    @Patch('suggestions/:id/apply')
    async applySuggestion(@Request() req, @Param('id') id: string) {
        return this.adsService.applySuggestion(id, req.user.companyId);
    }

    @Patch('suggestions/:id/ignore')
    async ignoreSuggestion(@Request() req, @Param('id') id: string) {
        return this.adsService.ignoreSuggestion(id, req.user.companyId);
    }
}
