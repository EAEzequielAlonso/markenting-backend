import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Church } from './church.entity';
import { ChurchMember } from './church-member.entity';
import { CounselingNote } from './counseling-note.entity';
import { CounselingStatus } from './enums';

@Entity('counseling_sessions')
export class CounselingSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, (church) => church.counselingSessions)
    church: Church;

    @ManyToOne(() => ChurchMember)
    counselor: ChurchMember;

    @ManyToOne(() => ChurchMember, { nullable: true })
    counseleeMember: ChurchMember;

    @Column({ nullable: true })
    counseleeName: string;

    @Column()
    date: Date;

    @Column({ type: 'enum', enum: CounselingStatus, default: CounselingStatus.OPEN })
    status: CounselingStatus;

    @OneToMany(() => CounselingNote, (note) => note.session)
    notes: CounselingNote[];
}
