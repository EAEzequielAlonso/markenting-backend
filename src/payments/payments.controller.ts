import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('mercadopago/create-preference')
    @UseGuards(JwtAuthGuard)
    async createMPPreference(@Body('amount') amount: number, @Body('planName') planName: string, @Request() req) {
        try {
            return await this.paymentsService.createMercadoPagoPreference(
                req.user.companyId,
                req.user.email,
                amount,
                planName
            );
        } catch (error: any) {
            console.error('[PaymentsController] Error creating preference:', error.message);
            throw new Error(`Fallo al crear preferencia: ${error.message}`);
        }
    }

    @Post('mercadopago/webhook')
    async handleWebhook(@Body() body: any) {
        console.log('Mercado Pago Webhook Received:', JSON.stringify(body, null, 2));
        return this.paymentsService.handleMercadoPagoWebhook(body);
    }
}
