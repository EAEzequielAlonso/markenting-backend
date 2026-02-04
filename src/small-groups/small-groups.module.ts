import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmallGroupsService } from './small-groups.service';
import { SmallGroupsController } from './small-groups.controller';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupMember } from './entities/small-group-member.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';

import { AgendaModule } from '../agenda/agenda.module';
import { ChurchMember } from 'src/members/entities/church-member.entity';

import { SmallGroupGuest } from './entities/small-group-guest.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SmallGroup, ChurchMember, SmallGroupMember, SmallGroupGuest, CalendarEvent]), AgendaModule],
    controllers: [SmallGroupsController],
    providers: [SmallGroupsService],
    exports: [SmallGroupsService],
})
export class SmallGroupsModule { }
