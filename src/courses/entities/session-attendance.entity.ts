import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { CourseSession } from './course-session.entity';
import { CourseParticipant } from './course-participant.entity';
import { CourseGuest } from './course-guest.entity';

@Entity('course_session_attendance')
export class SessionAttendance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CourseSession, { onDelete: 'CASCADE' })
    session: CourseSession;

    @ManyToOne(() => CourseParticipant, { nullable: true, onDelete: 'CASCADE' })
    participant: CourseParticipant;

    @ManyToOne(() => CourseGuest, { nullable: true, onDelete: 'CASCADE' })
    guest: CourseGuest;

    @Column({ default: false })
    present: boolean;

    @Column({ nullable: true })
    notes: string;
}
