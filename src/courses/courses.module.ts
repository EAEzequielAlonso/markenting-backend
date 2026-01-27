import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { CourseParticipant } from './entities/course-participant.entity';
import { CourseGuest } from './entities/course-guest.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { Church } from '../churches/entities/church.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { ContactsModule } from '../contacts/contacts.module';
import { SessionAttendance } from './entities/session-attendance.entity';

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
            CalendarEvent
        ]),
        ContactsModule
    ],
    controllers: [CoursesController],
    providers: [CoursesService],
    exports: [CoursesService]
})
export class CoursesModule { }
