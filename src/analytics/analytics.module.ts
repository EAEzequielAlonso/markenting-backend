import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AdsModule } from '../ads/ads.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CompaniesModule } from '../companies/companies.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AdsModule, WhatsappModule, CompaniesModule, AiModule],
    providers: [AnalyticsService],
    controllers: [AnalyticsController]
})
export class AnalyticsModule { }
