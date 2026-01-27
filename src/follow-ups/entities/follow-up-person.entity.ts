import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { FollowUpStatus } from '../../common/enums';

@Entity('follow_up_people')
export class FollowUpPerson {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ type: 'date', nullable: true })
    firstVisitDate: Date;

    @Column({
        type: 'enum',
        enum: FollowUpStatus,
        default: FollowUpStatus.ACTIVE
    })
    status: FollowUpStatus;

    @ManyToOne(() => Church)
    @JoinColumn({ name: 'churchId' })
    church: Church;

    @ManyToOne(() => ChurchMember, { nullable: true })
    @JoinColumn({ name: 'assignedMemberId' })
    assignedMember: ChurchMember;

    @Column({ nullable: true })
    createdByMemberId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
