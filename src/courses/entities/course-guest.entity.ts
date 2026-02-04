import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Course } from './course.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { FollowUpPerson } from '../../follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from './person-invited.entity';

@Entity('course_guests')
export class CourseGuest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Course, (course) => course.guests, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column()
    fullName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    // Future-proofing: If this guest converts to a member later
    @ManyToOne(() => ChurchMember, { nullable: true })
    @JoinColumn({ name: 'converted_to_member_id' })
    convertedToMember: ChurchMember;

    // Link to Centralized FollowUp (Visitor)
    @ManyToOne(() => FollowUpPerson, { nullable: true })
    @JoinColumn({ name: 'follow_up_person_id' })
    followUpPerson: FollowUpPerson;

    @CreateDateColumn()
    addedAt: Date;

    @ManyToOne(() => PersonInvited, { nullable: true })
    @JoinColumn({ name: 'person_invited_id' })
    personInvited: PersonInvited;
}
