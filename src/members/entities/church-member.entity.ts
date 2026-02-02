import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Person } from '../../users/entities/person.entity';
import { Church } from '../../churches/entities/church.entity';
import { MembershipStatus, EcclesiasticalRole, FunctionalRole } from '../../common/enums';
import { MinistryMember } from '../../ministries/entities/ministry-member.entity';

@Entity('church_members')
export class ChurchMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Person, (person) => person.memberships, { nullable: false })
    person: Person;

    @ManyToOne(() => Church, (church) => church.members)
    church: Church;

    @Column({
        type: 'enum',
        enum: MembershipStatus,
        default: MembershipStatus.MEMBER
    })
    status: MembershipStatus;

    @Column({
        type: 'enum',
        enum: EcclesiasticalRole,
        default: EcclesiasticalRole.NONE
    })
    ecclesiasticalRole: EcclesiasticalRole;

    @Column({
        type: 'enum',
        enum: FunctionalRole,
        array: true,
        default: [FunctionalRole.MEMBER]
    })
    functionalRoles: FunctionalRole[];

    @Column({ default: false })
    isAuthorizedCounselor: boolean;

    @OneToMany(() => MinistryMember, (mm) => mm.member)
    ministries: MinistryMember[];

    @CreateDateColumn()
    joinedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
