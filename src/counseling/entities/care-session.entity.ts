import { CareProcess } from './care-process.entity';
import { CareNote } from './care-note.entity';
import { CareTask } from './care-task.entity';
import { CareSessionStatus } from '../../common/enums';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('care_sessions')
export class CareSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CareProcess, (process) => process.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'process_id' })
    process: CareProcess;

    @OneToMany(() => CareTask, (task) => task.session, { cascade: true })
    tasks: CareTask[];

    @OneToMany(() => CareNote, (note) => note.session)
    notes: CareNote[];

    @Column({ type: 'timestamp' })
    date: Date;

    @Column({ type: 'int', default: 60 })
    durationMinutes: number;

    @Column({
        type: 'enum',
        enum: CareSessionStatus,
        default: CareSessionStatus.SCHEDULED
    })
    status: CareSessionStatus;

    @Column({ type: 'text', nullable: true })
    topics: string; // Summary or agenda

    @Column({ type: 'text', nullable: true })
    privateNotes: string; // Internal notes for the counselor about the session itself

    @Column({ type: 'text', nullable: true })
    location: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
