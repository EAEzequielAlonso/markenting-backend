import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayersService } from './prayers.service';
import { PrayersController } from './prayers.controller';
import { PrayerRequest } from './entities/prayer-request.entity';
import { PrayerUpdate } from './entities/prayer-update.entity';
import { ChurchMember } from '../members/entities/church-member.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PrayerRequest, PrayerUpdate, ChurchMember])],
    controllers: [PrayersController],
    providers: [PrayersService],
    exports: [PrayersService]
})
export class PrayersModule { }
