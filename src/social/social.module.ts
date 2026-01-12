import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelIntegration } from './entities/channel-integration.entity';
import { ConfigModule } from '@nestjs/config';
import { CompaniesModule } from '../companies/companies.module';
import { AiModule } from '../ai/ai.module';
import { OrganicCampaign } from './entities/organic-campaign.entity';
import { OrganicPost } from './entities/organic-post.entity';
import { OrganicCampaignsService } from './organic-campaigns.service';
import { OrganicCampaignsController } from './organic-campaigns.controller';
import { Company } from '../companies/entities/company.entity';
import { UsageService } from 'src/subscriptions/usage.service';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelIntegration, OrganicCampaign, OrganicPost, Company, Subscription]),
    ConfigModule,
    CompaniesModule,
    AiModule,
  ],
  providers: [SocialService, OrganicCampaignsService, UsageService,],
  controllers: [SocialController, OrganicCampaignsController],
  exports: [SocialService, OrganicCampaignsService]
})
export class SocialModule { }
