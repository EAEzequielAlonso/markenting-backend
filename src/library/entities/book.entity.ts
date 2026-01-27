import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { BookOwnershipType, BookStatus } from '../../common/enums/library.enums';

@Entity('books')
export class Book {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    author: string;

    @Column({ nullable: true })
    category: string; // Tema / Categoría

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ nullable: true })
    isbn: string;

    @Column({ nullable: true })
    coverUrl: string;

    @Column({
        type: 'enum',
        enum: BookOwnershipType,
        default: BookOwnershipType.CHURCH
    })
    ownershipType: BookOwnershipType;

    @Column({
        type: 'enum',
        enum: BookStatus,
        default: BookStatus.AVAILABLE
    })
    status: BookStatus;

    // Si es propiedad de la iglesia, esto idealmente es null. Si es de un miembro, es obligatorio.
    // Aunque en la práctica, para simplificar, permitimos null.
    @ManyToOne(() => ChurchMember, { nullable: true })
    ownerMember: ChurchMember;

    // Código interno opcional (ej: LIB-001)
    @Column({ nullable: true })
    code: string;

    // Estado físico / Notas
    @Column({ nullable: true, type: 'text' })
    condition: string;

    @ManyToOne(() => Church, { nullable: false })
    church: Church;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
