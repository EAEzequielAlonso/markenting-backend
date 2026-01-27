import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsService } from './follow-ups.service';
import { FollowUpPerson } from './entities/follow-up-person.entity';
import { ChurchMember } from '../members/entities/church-member.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FollowUpPerson, ChurchMember])],
    controllers: [FollowUpsController],
    providers: [FollowUpsService],
})
export class FollowUpsModule { }
