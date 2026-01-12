import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Ministry } from './ministry.entity';
import { ChurchMember } from './church-member.entity';

@Entity('ministry_members')
export class MinistryMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Ministry, (ministry) => ministry.members)
    ministry: Ministry;

    @ManyToOne(() => ChurchMember, (member) => member.ministries)
    member: ChurchMember;

    @Column({ nullable: true })
    roleInMinistry: string;

    @CreateDateColumn()
    joinedAt: Date;
}
