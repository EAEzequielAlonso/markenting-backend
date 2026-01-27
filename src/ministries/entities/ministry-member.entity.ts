import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Ministry } from './ministry.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { MinistryRole } from '../../common/enums';

@Entity('ministry_members')
export class MinistryMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Ministry, (ministry) => ministry.members)
    ministry: Ministry;

    @ManyToOne(() => ChurchMember, (member) => member.ministries)
    member: ChurchMember;

    @Column({
        type: 'enum',
        enum: MinistryRole,
        default: MinistryRole.TEAM_MEMBER
    })
    roleInMinistry: MinistryRole;

    @Column({ default: 'active' })
    status: 'active' | 'inactive';

    @CreateDateColumn()
    joinedAt: Date;
}
