import { Injectable } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionPlan } from '../subscriptions/entities/subscription.entity';

@Injectable()
export class PaymentsService {
    constructor(
        private mercadoPagoService: MercadoPagoService,
        private subscriptionsService: SubscriptionsService,
    ) { }

    async createMercadoPagoPreference(companyId: string, email: string, amount: number, planName: string) {
        return this.mercadoPagoService.createSubscription(companyId, email, amount, planName);
    }

    async handleMercadoPagoWebhook(body: any) {
        // En MP, el webhook puede ser por 'payment' o 'merchant_order'
        // Nos interesa el payment id
        const paymentId = body.data?.id || body.resource?.split('/').pop();
        const topic = body.type || body.topic;

        if (topic === 'payment') {
            try {
                const payment = await this.mercadoPagoService.getPayment(paymentId);
                console.log(`[Webhook] Processing payment ${paymentId}. Status: ${payment.status}`);

                if (payment.status === 'approved') {
                    const companyId = payment.external_reference;
                    // El items[0].id contiene el plan (ej: EMPRENDEDOR, BUSINESS_PRO)
                    const planName = payment.additional_info?.items?.[0]?.id as SubscriptionPlan;

                    if (companyId && planName) {
                        await this.subscriptionsService.activatePlan(companyId, planName);
                        console.log(`[Webhook] Success: Plan ${planName} activated for company ${companyId}`);
                    }
                }
            } catch (error) {
                console.error('[Webhook] Error processing payment:', error.message);
            }
        }

        return { received: true };
    }
}
