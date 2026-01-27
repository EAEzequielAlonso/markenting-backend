import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { CareParticipant } from './care-participant.entity';
import { CareNote } from './care-note.entity';
import { CareSession } from './care-session.entity';
import { CareProcessType, CareProcessStatus } from '../../common/enums';

@Entity('care_processes')
export class CareProcess {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: CareProcessType,
        default: CareProcessType.INFORMAL
    })
    type: CareProcessType;

    @Column({
        type: 'enum',
        enum: CareProcessStatus,
        default: CareProcessStatus.DRAFT
    })
    status: CareProcessStatus;

    @Column({ type: 'text', nullable: true })
    motive: string;

    @Column({ type: 'timestamp', nullable: true })
    startDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    endDate: Date;

    @ManyToOne(() => Church, { nullable: false })
    @JoinColumn({ name: 'church_id' })
    church: Church;

    @OneToMany(() => CareParticipant, (participant) => participant.process, { cascade: true })
    participants: CareParticipant[];

    @OneToMany(() => CareNote, (note) => note.process)
    notes: CareNote[];

    @OneToMany(() => CareSession, (session) => session.process)
    sessions: CareSession[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
