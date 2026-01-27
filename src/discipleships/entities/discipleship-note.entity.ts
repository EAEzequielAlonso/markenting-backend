import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Discipleship } from './discipleship.entity';
import { DiscipleshipMeeting } from './discipleship-meeting.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { DiscipleshipNoteType } from '../../common/enums';

@Entity('discipleship_notes')
export class DiscipleshipNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Discipleship, (discipleship) => discipleship.notes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'discipleship_id' })
    discipleship: Discipleship;

    @ManyToOne(() => DiscipleshipMeeting, (meeting) => meeting.notes, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'meeting_id' })
    meeting: DiscipleshipMeeting;

    @ManyToOne(() => ChurchMember, { nullable: false })
    @JoinColumn({ name: 'author_id' })
    author: ChurchMember;

    @Column({
        type: 'enum',
        enum: DiscipleshipNoteType,
        default: DiscipleshipNoteType.PRIVATE
    })
    type: DiscipleshipNoteType;

    @Column({ nullable: true })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
