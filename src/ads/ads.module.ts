import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { CompaniesModule } from '../companies/companies.module';
import { ConfigModule, ConfigService } from '@nestjs/config'; // This import will be removed as ConfigModule is removed from imports array
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdSuggestion } from './entities/ad-suggestion.entity'; // Added AdSuggestion import
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AiModule } from '../ai/ai.module'; // Added AiModule import

@Module({
    imports: [
        TypeOrmModule.forFeature([AdCampaign, AdSuggestion]),
        SubscriptionsModule,
        AiModule,
        CompaniesModule
    ],
    controllers: [AdsController],
    providers: [AdsService, ConfigService],
    exports: [AdsService],
})
export class AdsModule { }
