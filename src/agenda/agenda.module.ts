import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { CareSession } from '../counseling/entities/care-session.entity';
import { CareTask } from '../counseling/entities/care-task.entity';
import { ChurchMember } from '../members/entities/church-member.entity';

import { CareProcess } from '../counseling/entities/care-process.entity';
import { CareParticipant } from '../counseling/entities/care-participant.entity';
import { Person } from '../users/entities/person.entity';
import { CalendarEvent } from './entities/calendar-event.entity';

import { Ministry } from '../ministries/entities/ministry.entity';
import { SmallGroup } from '../small-groups/entities/small-group.entity';
import { SmallGroupMember } from '../small-groups/entities/small-group-member.entity';

import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([CareSession, CareTask, ChurchMember, CareProcess, CareParticipant, Person, CalendarEvent, Ministry, SmallGroup, SmallGroupMember, MinistryRoleAssignment]),
    ],
    controllers: [AgendaController],
    providers: [AgendaService],
    exports: [AgendaService]
})
export class AgendaModule { }
