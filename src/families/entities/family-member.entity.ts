import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { Family } from './family.entity';
import { FamilyRole } from '../../common/enums';

@Entity('family_members')
export class FamilyMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ChurchMember, { nullable: false, onDelete: 'CASCADE' })
    member: ChurchMember;

    @ManyToOne(() => Family, (family) => family.members, { nullable: false, onDelete: 'CASCADE' })
    family: Family;

    @Column({
        type: 'enum',
        enum: FamilyRole,
        default: FamilyRole.CHILD
    })
    role: FamilyRole;

    @CreateDateColumn()
    joinedAt: Date;
}
