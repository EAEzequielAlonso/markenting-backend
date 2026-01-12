import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { ChurchMember } from './church-member.entity';
import { Notification } from './notification.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    password: string;

    @Column()
    fullName: string;

    @Column({ default: false })
    isPlatformAdmin: boolean;

    @OneToMany(() => ChurchMember, (member) => member.user)
    memberships: ChurchMember[];

    @OneToMany(() => Notification, (notification) => notification.user)
    notifications: Notification[];

    @CreateDateColumn()
    createdAt: Date;
}
