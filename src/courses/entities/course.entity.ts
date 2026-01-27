import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { CourseStatus, ProgramType } from '../../common/enums';
import { CourseSession } from './course-session.entity';
import { CourseParticipant } from './course-participant.entity';
import { CourseGuest } from './course-guest.entity';

@Entity('courses')
export class Course {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'church_id' })
    church: Church;

    @Column()
    title: string;

    @Column({
        type: 'enum',
        enum: ProgramType,
        default: ProgramType.COURSE
    })
    type: ProgramType;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    category: string;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date; // Nullable as per request

    @Column({ nullable: true })
    capacity: number;

    @Column({ default: '#6366f1' })
    color: string;

    @Column({
        type: 'enum',
        enum: CourseStatus,
        default: CourseStatus.DRAFT
    })
    status: CourseStatus;

    @ManyToOne(() => ChurchMember, { nullable: true })
    @JoinColumn({ name: 'created_by_id' })
    createdBy: ChurchMember; // Pastor or Admin who created it

    @OneToMany(() => CourseSession, (session) => session.course)
    sessions: CourseSession[];

    @OneToMany(() => CourseParticipant, (participant) => participant.course)
    participants: CourseParticipant[];

    @OneToMany(() => CourseGuest, (guest) => guest.course)
    guests: CourseGuest[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
