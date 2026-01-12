import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrganicCampaignsService } from './organic-campaigns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('organic-campaigns')
@Controller('organic-campaigns')
@UseGuards(JwtAuthGuard)
export class OrganicCampaignsController {
    constructor(private readonly campaignService: OrganicCampaignsService) { }

    @Post()
    @ApiOperation({ summary: 'Crear una nueva campaña orgánica con IA' })
    async create(@Body() data: any, @Request() req) {
        return this.campaignService.create(req.user.companyId, data);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas las campañas orgánicas de la empresa' })
    async findAll(@Request() req) {
        return this.campaignService.findAllByCompany(req.user.companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de una campaña específica' })
    async findOne(@Param('id') id: string) {
        return this.campaignService.findOne(id);
    }

    @Post('posts/:postId/regenerate')
    @ApiOperation({ summary: 'Regenerar el contenido de un post específico' })
    async regenerate(@Param('postId') postId: string, @Request() req) {
        return this.campaignService.regeneratePost(postId, req.user.companyId);
    }
}
