import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { FamilyMember } from './family-member.entity';

@Entity('families')
export class Family {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string; // e.g. "Familia Pérez"

    @ManyToOne(() => Church, (church) => church.families)
    church: Church;

    @OneToMany(() => FamilyMember, (member) => member.family)
    members: FamilyMember[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
