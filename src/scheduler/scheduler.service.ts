import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { OrganicPost, OrganicPostStatus } from '../social/entities/organic-post.entity';
import { SocialService } from '../social/social.service';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        @InjectRepository(OrganicPost)
        private organicPostRepository: Repository<OrganicPost>,
        private socialService: SocialService,
    ) { }

    // Run every hour to check for posts scheduled in the past that haven't been published
    @Cron(CronExpression.EVERY_HOUR)
    async handleScheduledPublishing() {
        this.logger.log('Checking for scheduled posts to publish...');

        const now = new Date();
        const pendingPosts = await this.organicPostRepository.find({
            where: {
                status: OrganicPostStatus.PLANNED,
                scheduledFor: LessThanOrEqual(now)
            },
            relations: ['campaign', 'campaign.company']
        });

        if (pendingPosts.length === 0) {
            this.logger.log('No pending posts found.');
            return;
        }

        this.logger.log(`Found ${pendingPosts.length} posts to publish.`);

        for (const post of pendingPosts) {
            try {
                this.logger.log(`Publishing post ${post.id} to ${post.platform}...`);
                await this.socialService.publishPost(post, post.campaign.company);

                post.status = OrganicPostStatus.PUBLISHED;
                post.publishedAt = new Date();
                await this.organicPostRepository.save(post);

                this.logger.log(`Post ${post.id} published successfully.`);
            } catch (error) {
                this.logger.error(`Failed to publish post ${post.id}: ${error.message}`);
                // Optional: Implement retry logic or mark as FAILED after N attempts
                post.status = OrganicPostStatus.FAILED; // For now, mark as failed so we don't retry indefinitely in this loop
                await this.organicPostRepository.save(post);
            }
        }
    }

    // Ejemplo de análisis diario (Corre a medianoche)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyAnalysis() {
        this.logger.log('Starting daily AI analysis of campaigns...');
        // Logic will be added in Phase 4
    }
}
