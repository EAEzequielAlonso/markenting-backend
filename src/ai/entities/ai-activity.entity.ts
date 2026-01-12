import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum AiActivityType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

@Entity('ai_activities')
export class AiActivity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Company)
    company: Company;

    @Column({
        type: 'enum',
        enum: AiActivityType,
        default: AiActivityType.INFO
    })
    type: AiActivityType;

    @Column()
    message: string;

    @Column({ nullable: true })
    details: string; // Optional technical details or JSON string

    @Column({ default: 'SISTEMA' })
    agentName: string; // "Agente de Marketing", "Optimizador de Ads", etc.

    @CreateDateColumn()
    createdAt: Date;
}
