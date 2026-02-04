import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { PeopleFunnelService } from './people-funnel.service';
import { CoursesController } from './courses.controller';
import { InvitedPeopleController } from './invited-people.controller';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { CourseParticipant } from './entities/course-participant.entity';
import { CourseGuest } from './entities/course-guest.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { Church } from '../churches/entities/church.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { ContactsModule } from '../contacts/contacts.module';
import { SessionAttendance } from './entities/session-attendance.entity';
import { FamiliesModule } from '../families/families.module';
import { FollowUpPerson } from 'src/follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from './entities/person-invited.entity';
import { Person } from 'src/users/entities/person.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Course,
            CourseSession,
            CourseParticipant,
            CourseGuest,
            SessionAttendance,
            ChurchMember,
            Church,
            CalendarEvent,
            FollowUpPerson,
            PersonInvited,
            Person
        ]),
        ContactsModule,
        FamiliesModule
    ],
    controllers: [CoursesController, InvitedPeopleController],
    providers: [CoursesService, PeopleFunnelService],
    exports: [CoursesService, PeopleFunnelService]
})
export class CoursesModule { }
