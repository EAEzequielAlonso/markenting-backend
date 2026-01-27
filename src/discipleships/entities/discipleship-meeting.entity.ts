import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Discipleship } from './discipleship.entity';
import { DiscipleshipTask } from './discipleship-task.entity';
import { DiscipleshipNote } from './discipleship-note.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Entity('discipleship_meetings')
export class DiscipleshipMeeting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Discipleship, (discipleship) => discipleship.meetings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'discipleship_id' })
    discipleship: Discipleship;

    @Column({ type: 'timestamp' })
    date: Date;

    @Column({ type: 'int', default: 60 })
    durationMinutes: number;

    @Column({ nullable: true })
    title: string;

    @Column({
        type: 'enum',
        enum: ['PRESENCIAL', 'VIRTUAL'],
        default: 'PRESENCIAL'
    })
    type: 'PRESENCIAL' | 'VIRTUAL';

    @Column({ type: 'text', nullable: true })
    summary: string; // Brief summary of what happened

    @Column({ type: 'text', nullable: true })
    location: string;

    @Column({ nullable: true })
    color: string;

    @OneToMany(() => DiscipleshipNote, (note) => note.meeting)
    notes: DiscipleshipNote[];

    @OneToMany(() => DiscipleshipTask, (task) => task.meeting)
    tasks: DiscipleshipTask[];

    @OneToOne(() => CalendarEvent, (event) => event.discipleshipMeeting, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'calendar_event_id' })
    calendarEvent: CalendarEvent;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
