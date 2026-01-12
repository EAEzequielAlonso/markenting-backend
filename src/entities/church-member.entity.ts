import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Church } from './church.entity';
import { ChurchRole, MemberStatus } from './enums';
import { MinistryMember } from './ministry-member.entity';

@Entity('church_members')
export class ChurchMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.memberships)
    user: User;

    @ManyToOne(() => Church, (church) => church.members)
    church: Church;

    @Column({ type: 'simple-array', nullable: true })
    roles: ChurchRole[];

    @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.PENDING })
    status: MemberStatus;

    @OneToMany(() => MinistryMember, (mm) => mm.member)
    ministries: MinistryMember[];

    @CreateDateColumn()
    joinedAt: Date;
}
