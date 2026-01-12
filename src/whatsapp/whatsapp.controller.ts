import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('whatsapp')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) { }

    // Verificación de Webhook de Meta
    @Get('webhook')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ) {
        const verifyToken = 'antigravedad-secret-token'; // Debería estar en .env
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        return 'Verification failed';
    }

    // Recepción de mensajes
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() data: any) {
        return this.whatsappService.handleWebhook(data);
    }

    @Get('inbox')
    @UseGuards(JwtAuthGuard)
    async getInbox(@Request() req) {
        return this.whatsappService.getLeadsByCompany(req.user.companyId);
    }
}
