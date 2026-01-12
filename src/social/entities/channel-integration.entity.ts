import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum SocialProvider {
    META = 'META',
    GOOGLE = 'GOOGLE',
    TIKTOK = 'TIKTOK',
}

export enum IntegrationStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    REVOKED = 'REVOKED',
}

@Entity('channel_integrations')
export class ChannelIntegration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Company, { onDelete: 'CASCADE' })
    company: Company;

    @Column({ type: 'enum', enum: SocialProvider })
    provider: SocialProvider;

    // IMPORTANTE: En producción estos campos deben estar encriptados
    @Column({ type: 'text' })
    accessToken: string;

    @Column({ type: 'text', nullable: true })
    refreshToken: string;

    @Column()
    externalId: string; // ID de la AdAccount o Page

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>; // Para guardar nombre de la página, número de WhatsApp, etc.

    @Column({ type: 'enum', enum: IntegrationStatus, default: IntegrationStatus.ACTIVE })
    status: IntegrationStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
