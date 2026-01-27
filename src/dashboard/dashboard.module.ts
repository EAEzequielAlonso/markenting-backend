import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchMember } from '../members/entities/church-member.entity';
import { SmallGroup } from '../small-groups/entities/small-group.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { FollowUpPerson } from '../follow-ups/entities/follow-up-person.entity';
import { WorshipService } from '../worship/entities/worship-service.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchMember,
      SmallGroup,
      TreasuryTransaction,
      FollowUpPerson,
      WorshipService, // Imported
      CalendarEvent   // Imported
    ])
  ],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule { }
