import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Course } from './course.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { CourseRole } from '../../common/enums';

@Entity('course_participants')
export class CourseParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Course, (course) => course.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @ManyToOne(() => ChurchMember, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'member_id' })
    member: ChurchMember;

    @Column({
        type: 'enum',
        enum: CourseRole,
        default: CourseRole.ATTENDEE
    })
    role: CourseRole;

    @CreateDateColumn()
    enrolledAt: Date;
}
