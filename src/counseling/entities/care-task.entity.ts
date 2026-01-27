import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CareSession } from './care-session.entity';
import { CareTaskStatus } from '../../common/enums';

@Entity('care_tasks')
export class CareTask {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CareSession, (session) => session.tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: CareSession;

    @Column({ type: 'text', nullable: true })
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'text', nullable: true })
    counseleeResponse: string; // Respuesta del aconsejado

    @Column({ type: 'text', nullable: true })
    counselorFeedback: string; // Devolución del consejero

    @Column({
        type: 'enum',
        enum: CareTaskStatus,
        default: CareTaskStatus.PENDING
    })
    status: CareTaskStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
