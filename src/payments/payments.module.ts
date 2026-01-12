import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercadopago.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [SubscriptionsModule, ConfigModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, MercadoPagoService],
})
export class PaymentsModule { }
