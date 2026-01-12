import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/env.validation';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Company } from './companies/entities/company.entity';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { SocialModule } from './social/social.module';
import { Subscription } from './subscriptions/entities/subscription.entity';
import { Lead } from './whatsapp/entities/lead.entity';
import { AdCampaign } from './ads/entities/ad-campaign.entity';
import { AdSuggestion } from './ads/entities/ad-suggestion.entity';
import { OrganicCampaign } from './social/entities/organic-campaign.entity';
import { OrganicPost } from './social/entities/organic-post.entity';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { AdsModule } from './ads/ads.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiActivity } from './ai/entities/ai-activity.entity';
import { AdDailyMetric } from './ads/entities/ad-daily-metric.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Company, User, Subscription, Lead, AdCampaign, AdSuggestion, OrganicCampaign, OrganicPost, AiActivity, AdDailyMetric],
      synchronize: false, // ¡Solo en desarrollo! Crea tablas automáticamente
      dropSchema: false,
      logging: false,
    }),
    UsersModule,
    AuthModule,
    CompaniesModule,
    SocialModule,
    SubscriptionsModule,
    PaymentsModule,
    AiModule,
    AdsModule,
    WhatsappModule,
    AnalyticsModule,
    ScheduleModule.forRoot(),
    SchedulerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
