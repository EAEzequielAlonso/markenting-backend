import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Church } from 'src/churches/entities/church.entity';

export enum ContactStatus {
    NEW = 'NEW',
    VISITOR = 'VISITOR',
    INTERESTED = 'INTERESTED',
    CONVERTED = 'CONVERTED', // Should become a Member eventually
    ARCHIVED = 'ARCHIVED'
}

@Entity('contacts')
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, { onDelete: 'CASCADE' })
    church: Church;

    @Column()
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({
        type: 'enum',
        enum: ContactStatus,
        default: ContactStatus.NEW
    })
    status: ContactStatus;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ nullable: true })
    source: string; // e.g. "Course: Membresía"

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
