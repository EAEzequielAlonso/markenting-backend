import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Person } from '../../users/entities/person.entity';
import { Church } from '../../churches/entities/church.entity';
import { MembershipStatus, EcclesiasticalRole } from '../../common/enums';
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
        default: MembershipStatus.PROSPECT
    })
    status: MembershipStatus;

    @Column({
        type: 'enum',
        enum: EcclesiasticalRole,
        default: EcclesiasticalRole.NONE
    })
    roles: EcclesiasticalRole; // Renaming to 'roles' typographically but storing single enum for hierarchy? Or should it be an array?
    // Specification said "Enum: EcclesiasticalRole". Usually roles are single hierarchy in this context (e.g. you are either a Pastor OR an Elder, or maybe both?)
    // "Usa Postgres ENUMS para todas las columnas de rol".
    // If multiple roles are needed, Postgres supports array of enums.
    // However, the prompt implies "EcclesiasticalRole (La jerarquía)". Hierarchy usually implies single rank.
    // Let's assume single role for simplicity and hierarchy. If multiple needed, we can change to array.
    // Wait, the specification says: "EcclesiasticalRole (La jerarquía)... NONE (Default)".
    // I'll stick to a single column 'ecclesiasticalRole' for clarity.

    @Column({
        type: 'enum',
        enum: EcclesiasticalRole,
        default: EcclesiasticalRole.NONE
    })
    ecclesiasticalRole: EcclesiasticalRole;

    @Column({ default: false })
    isAuthorizedCounselor: boolean;

    @OneToMany(() => MinistryMember, (mm) => mm.member)
    ministries: MinistryMember[];

    @CreateDateColumn()
    joinedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
