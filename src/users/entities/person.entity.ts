import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { Notification } from '../../notifications/entities/notification.entity';

import { MaritalStatus, Sex } from 'src/common/enums';
import { PersonInvited } from '../../courses/entities/person-invited.entity';

@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, type: 'date' })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: Sex,
    nullable: true,
  })
  sex: Sex;

  @Column({ nullable: true })
  documentId: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  // 📞 Emergencia
  @Column({ nullable: true })
  emergencyContactName: string;

  @Column({ nullable: true })
  emergencyContactPhone: string;

  // 👨‍👩‍👧‍👦
  @Column({
    type: 'enum',
    enum: MaritalStatus,
    nullable: true,
  })
  maritalStatus: MaritalStatus;

  // 🧑‍💼
  @Column({ nullable: true })
  occupation: string;

  // 📌 Flags
  @Column({ default: false })
  isBaptized: boolean;

  @Column({ default: true })
  isActive: boolean;

  // 🔐 Relaciones
  @OneToOne(() => User, (user) => user.person, { nullable: true })
  user: User;

  @OneToMany(() => ChurchMember, (member) => member.person)
  memberships: ChurchMember[];

  @OneToMany(() => Notification, (notification) => notification.person)
  notifications: Notification[];

  @OneToOne(() => PersonInvited, { nullable: true })
  @JoinColumn({ name: 'person_invited_id' })
  personInvited: PersonInvited;



  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
