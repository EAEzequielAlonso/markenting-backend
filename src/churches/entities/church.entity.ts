import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { PlanType, SubscriptionStatus } from '../../common/enums';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { TreasuryTransaction } from '../../treasury/entities/treasury-transaction.entity';
import { CareProcess } from '../../counseling/entities/care-process.entity';
import { SmallGroup } from '../../small-groups/entities/small-group.entity';
import { Family } from '../../families/entities/family.entity';
import { FollowUpPerson } from '../../follow-ups/entities/follow-up-person.entity';
import { Account } from '../../treasury/entities/account.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Entity('churches')
export class Church {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true, nullable: true })
    slug: string;

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ nullable: true })
    coverUrl: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    address: string;

    @Column({ type: 'enum', enum: PlanType, default: PlanType.TRIAL })
    plan: PlanType;

    @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
    subscriptionStatus: SubscriptionStatus;

    @Column({ nullable: true })
    trialEndsAt: Date;

    @OneToMany(() => ChurchMember, (member) => member.church)
    members: ChurchMember[];

    @OneToMany(() => Ministry, (ministry) => ministry.church)
    ministries: Ministry[];

    @OneToMany(() => TreasuryTransaction, (tx) => tx.church)
    transactions: TreasuryTransaction[];

    @OneToMany(() => CareProcess, (process) => process.church)
    careProcesses: CareProcess[];

    @OneToMany(() => SmallGroup, (group) => group.church)
    smallGroups: SmallGroup[];

    @OneToMany(() => Family, (family) => family.church)
    families: Family[];

    @OneToMany(() => FollowUpPerson, (followUp) => followUp.church)
    followUps: FollowUpPerson[];

    @OneToMany(() => Account, (acc) => acc.church)
    accounts: Account[];

    @OneToMany(() => Subscription, (sub) => sub.church)
    subscriptions: Subscription[];

    @OneToMany(() => CalendarEvent, (event) => event.church)
    calendarEvents: CalendarEvent[];
}
