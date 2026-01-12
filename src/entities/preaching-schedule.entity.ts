import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Church } from './church.entity';

@Entity('preaching_schedules')
export class PreachingSchedule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, (church) => church.preachings)
    church: Church;

    @Column()
    title: string;

    @Column()
    date: Date;

    @Column({ nullable: true })
    preacherName: string;

    @Column({ nullable: true })
    biblePassage: string;

    @CreateDateColumn()
    createdAt: Date;
}
