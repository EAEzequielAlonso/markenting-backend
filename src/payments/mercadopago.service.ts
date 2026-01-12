import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MercadoPagoService {
    private client: MercadoPagoConfig;

    constructor(private configService: ConfigService) {
        const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
        this.client = new MercadoPagoConfig({
            accessToken: accessToken
        });
    }

    async createSubscription(companyId: string, email: string, amount: number, planName: string) {
        const preference = new Preference(this.client);
        const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').trim().replace(/\/$/, '');
        const backendUrl = (this.configService.get<string>('BACKEND_URL') || 'http://localhost:3002').trim().replace(/\/$/, '');

        const body: any = {
            items: [
                {
                    id: planName.toUpperCase(),
                    title: `Plan ${planName} - AdVantage AI`,
                    quantity: 1,
                    unit_price: Number(amount),
                    currency_id: 'ARS',
                }
            ],
            payer: {
                email: email.trim(),
            },
            external_reference: companyId,
            back_urls: {
                success: `${frontendUrl}/dashboard/billing?status=success`,
                failure: `${frontendUrl}/dashboard/billing?status=failure`,
                pending: `${frontendUrl}/dashboard/billing?status=pending`,
            },
            // auto_return: 'approved', // Sometimes causes issues with localhost URLs
        };

        // Mercado Pago often rejects localhost for notification_url in preference creation
        if (!backendUrl.includes('localhost')) {
            body.notification_url = `${backendUrl}/payments/mercadopago/webhook`;
        }

        console.log('Sending Preference Body to Mercado Pago:', JSON.stringify(body, null, 2));

        try {
            const result = await preference.create({ body });
            return result;
        } catch (error) {
            console.error('Error creating Mercado Pago preference:', error);
            if (error.response) {
                console.error('Mercado Pago Response Error:', JSON.stringify(error.response, null, 2));
            }
            throw error;
        }
    }

    async getPayment(paymentId: string) {
        const { Payment } = require('mercadopago');
        const payment = new Payment(this.client);
        try {
            return await payment.get({ id: paymentId });
        } catch (error) {
            console.error('Error fetching Mercado Pago payment:', error);
            throw error;
        }
    }
}
