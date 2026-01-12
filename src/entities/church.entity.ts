import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ChurchMember } from './church-member.entity';
import { PlanType, SubscriptionStatus } from './enums';
import { Ministry } from './ministry.entity';
import { PreachingSchedule } from './preaching-schedule.entity';
import { TreasuryTransaction } from './treasury-transaction.entity';
import { CounselingSession } from './counseling-session.entity';

@Entity('churches')
export class Church {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true, nullable: true })
    slug: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    address: string;

    @Column({ type: 'enum', enum: PlanType, default: PlanType.FREE })
    plan: PlanType;

    @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
    subscriptionStatus: SubscriptionStatus;

    @Column({ nullable: true })
    trialEndsAt: Date;

    @OneToMany(() => ChurchMember, (member) => member.church)
    members: ChurchMember[];

    @OneToMany(() => Ministry, (ministry) => ministry.church)
    ministries: Ministry[];

    @OneToMany(() => PreachingSchedule, (schedule) => schedule.church)
    preachings: PreachingSchedule[];

    @OneToMany(() => TreasuryTransaction, (tx) => tx.church)
    transactions: TreasuryTransaction[];

    @OneToMany(() => CounselingSession, (session) => session.church)
    counselingSessions: CounselingSession[];
}
