import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { MinistryMember } from './ministry-member.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { MinistryTask } from './ministry-task.entity';
import { ServiceDuty } from './service-duty.entity';
import { MinistryRoleAssignment } from './ministry-role-assignment.entity';

@Entity('ministries')
export class Ministry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    color: string;

    @Column({ default: 'active' })
    status: 'active' | 'inactive';

    @ManyToOne(() => ChurchMember, { nullable: true })
    leader: ChurchMember; // Main leader reference

    @ManyToOne(() => Church, (church) => church.ministries)
    church: Church;

    @OneToMany(() => MinistryMember, (mm) => mm.ministry)
    members: MinistryMember[];

    @OneToMany(() => CalendarEvent, (event) => event.ministry)
    calendarEvents: CalendarEvent[];

    @OneToMany(() => MinistryTask, (task) => task.ministry)
    tasks: MinistryTask[];

    @OneToMany(() => ServiceDuty, (duty) => duty.ministry)
    serviceDuties: ServiceDuty[];

    @OneToMany(() => MinistryRoleAssignment, (assignment) => assignment.ministry)
    assignments: MinistryRoleAssignment[];
}
