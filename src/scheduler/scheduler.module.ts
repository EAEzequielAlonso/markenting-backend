import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialModule } from '../social/social.module';
import { OrganicPost } from '../social/entities/organic-post.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([OrganicPost]),
        SocialModule,
    ],
    providers: [SchedulerService],
    exports: [SchedulerService],
})
export class SchedulerModule { }
