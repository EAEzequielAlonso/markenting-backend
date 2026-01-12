import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { CounselingSession } from './counseling-session.entity';
import { ChurchMember } from './church-member.entity';

@Entity('counseling_notes')
export class CounselingNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CounselingSession, (session) => session.notes)
    session: CounselingSession;

    @ManyToOne(() => ChurchMember)
    author: ChurchMember;

    @Column('text')
    content: string;

    @Column({ default: true })
    isPrivate: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
