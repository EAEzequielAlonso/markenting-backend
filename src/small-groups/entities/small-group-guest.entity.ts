import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SmallGroup } from './small-group.entity';
import { FollowUpPerson } from '../../follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from '../../courses/entities/person-invited.entity';

@Entity('small_group_guests')
export class SmallGroupGuest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => SmallGroup, (group) => group.guests, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group: SmallGroup;

    @Column()
    fullName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @ManyToOne(() => FollowUpPerson, { nullable: true })
    @JoinColumn({ name: 'follow_up_person_id' })
    followUpPerson: FollowUpPerson;

    @ManyToOne(() => PersonInvited, { nullable: true })
    @JoinColumn({ name: 'person_invited_id' })
    personInvited: PersonInvited;

    @CreateDateColumn()
    addedAt: Date;
}
