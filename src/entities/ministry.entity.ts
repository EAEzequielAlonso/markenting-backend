import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Church } from './church.entity';
import { MinistryMember } from './ministry-member.entity';

@Entity('ministries')
export class Ministry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @ManyToOne(() => Church, (church) => church.ministries)
    church: Church;

    @OneToMany(() => MinistryMember, (mm) => mm.ministry)
    members: MinistryMember[];
}
