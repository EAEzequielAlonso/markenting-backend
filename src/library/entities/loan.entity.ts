import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Book } from './book.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { LoanStatus } from '../../common/enums/library.enums';

@Entity('loans')
export class Loan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Book, { nullable: false })
    book: Book;

    @ManyToOne(() => ChurchMember, { nullable: false })
    borrower: ChurchMember;

    @Column()
    outDate: Date;

    @Column()
    dueDate: Date;

    @Column({ nullable: true })
    returnDate: Date;

    @Column({
        type: 'enum',
        enum: LoanStatus,
        default: LoanStatus.ACTIVE
    })
    status: LoanStatus;
}
