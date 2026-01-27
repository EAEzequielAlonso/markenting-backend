import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { SmallGroupMember } from './small-group-member.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Entity('small_groups')
export class SmallGroup {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    objective: string;

    @Column({ nullable: true })
    studyMaterial: string;

    @Column({ nullable: true })
    currentTopic: string;

    @Column({ nullable: true })
    meetingDay: string; // e.g., "Viernes"

    @Column({ nullable: true })
    meetingTime: string; // e.g., "20:00"

    @Column({ nullable: true })
    address: string; // Default location

    @ManyToOne(() => Church, (church) => church.smallGroups)
    church: Church;

    @OneToMany(() => SmallGroupMember, (member) => member.group)
    members: SmallGroupMember[];

    @OneToMany(() => CalendarEvent, (event) => event.smallGroup)
    events: CalendarEvent[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
