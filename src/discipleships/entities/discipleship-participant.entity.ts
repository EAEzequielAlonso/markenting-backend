import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Discipleship } from './discipleship.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { DiscipleshipRole } from '../../common/enums';

@Entity('discipleship_participants')
export class DiscipleshipParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Discipleship, (discipleship) => discipleship.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'discipleship_id' })
    discipleship: Discipleship;

    @ManyToOne(() => ChurchMember, { nullable: false, eager: true })
    @JoinColumn({ name: 'member_id' })
    member: ChurchMember;

    @Column({
        type: 'enum',
        enum: DiscipleshipRole
    })
    role: DiscipleshipRole;

    @CreateDateColumn()
    joinedAt: Date;
}
