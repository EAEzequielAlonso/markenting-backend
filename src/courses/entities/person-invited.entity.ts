import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne, DeleteDateColumn } from 'typeorm';
import { FollowUpPerson } from '../../follow-ups/entities/follow-up-person.entity';
import { Person } from '../../users/entities/person.entity';

@Entity('person_invited')
export class PersonInvited {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Index()
    @Column({ nullable: true })
    email: string;


    @Column({ nullable: true })
    phone: string;

    @OneToOne(() => FollowUpPerson, (followUp) => followUp.personInvited)
    followUpPerson: FollowUpPerson;

    @OneToOne(() => Person, (person) => person.personInvited)
    person: Person;

    // We can add additional tracking or metadata here if needed

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
