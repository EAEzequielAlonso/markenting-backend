import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

export enum IndustryType {
  ECOMMERCE = 'ECOMMERCE',
  SERVICES = 'SERVICES',
  RETAIL = 'RETAIL',
  OTHER = 'OTHER',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: IndustryType, default: IndustryType.OTHER })
  industry: IndustryType;

  @Column({ nullable: true })
  goal: string;

  @Column({ nullable: true })
  metaToken: string;

  @Column({ nullable: true })
  adAccountId: string;

  @Column({ nullable: true })
  fbPageId: string;

  @Column({ nullable: true })
  fbPageAccessToken: string;

  @Column({ nullable: true })
  linkedinToken: string;

  @Column({ nullable: true })
  twitterToken: string;

  @Column({ nullable: true })
  tiktokToken: string;

  @Column({ nullable: true })
  googleAdsId: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ type: 'text', nullable: true })
  productsDescription: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monthlyBudget: number;

  @Column({ type: 'text', nullable: true })
  strategySummary: string;

  @Column({ nullable: true })
  referralCode: string;

  @Column({ default: 0, type: 'decimal', precision: 10, scale: 2 })
  credits: number;

  @Column({ default: 'FREE' })
  plan: string;

  @Column({ default: 0 })
  aiCreditsUsed: number;

  @Column({ default: false })
  onboardingCompleted: boolean;

  // Configuration for AI Agent
  @Column({ type: 'text', nullable: true })
  aiContext: string; // Base knowledge about the business

  @Column({ type: 'text', nullable: true })
  aiObjective: string; // What the agent should achieve (e.g. "Sell products", "Book appointments")

  @Column({ type: 'text', nullable: true })
  aiConstraints: string; // "Do not offer discounts", "Always use formal language"

  @Column({ type: 'text', nullable: true })
  aiTone: string; // "Friendly", "Professional", "Humorous"

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToOne(() => Subscription, (subscription) => subscription.company)
  subscription: Subscription;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
