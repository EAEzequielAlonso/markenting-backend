import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { UsageService } from './usage.service';
import { Company } from '../companies/entities/company.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Subscription, Company])],
    providers: [SubscriptionsService, UsageService],
    exports: [SubscriptionsService, UsageService],
})
export class SubscriptionsModule { }
