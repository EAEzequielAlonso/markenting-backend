import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Book } from './entities/book.entity';
import { Loan } from './entities/loan.entity';
import { BookOwnershipType, BookStatus, LoanStatus } from '../common/enums/library.enums';
import { ChurchMember } from '../members/entities/church-member.entity';

@Injectable()
export class LibraryService {
    constructor(
        @InjectRepository(Book) private bookRepo: Repository<Book>,
        @InjectRepository(Loan) private loanRepo: Repository<Loan>,
        @InjectRepository(ChurchMember) private memberRepo: Repository<ChurchMember>,
    ) { }

    // --- BOOKS ---

    async findAllBooks(churchId: string, search?: string) {
        const query = this.bookRepo.createQueryBuilder('book')
            .where('book.church.id = :churchId', { churchId })
            .leftJoinAndSelect('book.ownerMember', 'owner')
            .leftJoinAndSelect('owner.person', 'ownerPerson') // Agregado para ver el nombre del dueño
            .leftJoinAndSelect('book.church', 'church');

        if (search) {
            query.andWhere('(book.title ILIKE :search OR book.author ILIKE :search OR book.category ILIKE :search)', { search: `%${search}%` });
        }

        query.orderBy('book.createdAt', 'DESC');

        return query.getMany();
    }

    async createBook(churchId: string, data: Partial<Book> & { ownerMemberId?: string }) {
        let ownerMember = null;
        if (data.ownershipType === BookOwnershipType.MEMBER) {
            if (!data.ownerMemberId) throw new BadRequestException('Se requiere el ID del miembro dueño');
            ownerMember = await this.memberRepo.findOne({ where: { id: data.ownerMemberId } });
            if (!ownerMember) throw new NotFoundException('Miembro dueño no encontrado');
        }

        const book = this.bookRepo.create({
            ...data,
            ownerMember,
            church: { id: churchId },
            status: BookStatus.AVAILABLE // Always available on creation
        });
        return this.bookRepo.save(book);
    }

    async updateBook(bookId: string, data: Partial<Book>) {
        const book = await this.bookRepo.findOne({ where: { id: bookId } });
        if (!book) throw new NotFoundException('Libro no encontrado');

        Object.assign(book, data);
        return this.bookRepo.save(book);
    }

    async deleteBook(bookId: string) {
        const book = await this.bookRepo.findOne({ where: { id: bookId }, relations: ['ownerMember'] });
        if (!book) throw new NotFoundException('Libro no encontrado');

        // Optional validation: check for active loans before deleting? 
        // For simplicity: DB constraint might block deletion if loans exist.
        return this.bookRepo.remove(book);
    }


    // --- LOANS ---

    async requestLoan(bookId: string, borrowerMemberId: string, durationDays: number = 14) {
        const book = await this.bookRepo.findOne({ where: { id: bookId } });
        if (!book) throw new NotFoundException('Libro no encontrado');

        if (book.status !== BookStatus.AVAILABLE) {
            throw new BadRequestException('El libro no está disponible para solicitud');
        }

        const borrower = await this.memberRepo.findOne({ where: { id: borrowerMemberId } });
        if (!borrower) throw new NotFoundException('Miembro no encontrado');

        // Check availability logic? 
        // For now just create request.

        const loan = this.loanRepo.create({
            book,
            borrower,
            outDate: new Date(), // Request date
            dueDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000), // Provisional due date
            status: LoanStatus.REQUESTED
        });

        return this.loanRepo.save(loan);
    }

    async approveLoan(loanId: string) {
        const loan = await this.loanRepo.findOne({ where: { id: loanId }, relations: ['book'] });
        if (!loan) throw new NotFoundException('Solicitud no encontrada');
        if (loan.status !== LoanStatus.REQUESTED) throw new BadRequestException('La solicitud no está en estado pendiente');

        if (loan.book.status !== BookStatus.AVAILABLE) {
            throw new BadRequestException('El libro ya no está disponible');
        }

        loan.status = LoanStatus.ACTIVE;
        loan.outDate = new Date(); // Reset outDate to Approval Date
        // Keep original proposed duration or recalculate due date? 
        // Let's keep original gap.

        loan.book.status = BookStatus.LOANED;
        await this.bookRepo.save(loan.book);

        return this.loanRepo.save(loan);
    }

    async rejectLoan(loanId: string) {
        const loan = await this.loanRepo.findOne({ where: { id: loanId } });
        if (!loan) throw new NotFoundException('Solicitud no encontrada');

        loan.status = LoanStatus.REJECTED;
        return this.loanRepo.save(loan);
    }

    async loanBook(bookId: string, borrowerMemberId: string, durationDays: number = 14, dueDate?: string) {
        // Enforce transaction implicitly or explicitly if critical, simply logic here
        const book = await this.bookRepo.findOne({ where: { id: bookId } });
        if (!book) throw new NotFoundException('Libro no encontrado');

        if (book.status !== BookStatus.AVAILABLE) {
            throw new BadRequestException('El libro no está disponible para préstamo');
        }

        const borrower = await this.memberRepo.findOne({ where: { id: borrowerMemberId } });
        if (!borrower) throw new NotFoundException('Miembro prestatario no encontrado');

        const outDate = new Date();
        let finalDueDate: Date;

        if (dueDate) {
            // El input 'date' de HTML devuelve 'YYYY-MM-DD'. 
            // New Date('YYYY-MM-DD') se interpreta asumiendo UTC, lo que causa desfase si el server/browser no está en UTC.
            // Forzamos a que sea la fecha local al mediodía para evitar que cambie de día por zona horaria.
            const parts = dueDate.split('-').map(Number);
            finalDueDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

            if (isNaN(finalDueDate.getTime())) {
                finalDueDate = new Date();
                finalDueDate.setDate(outDate.getDate() + durationDays);
            }
        } else {
            finalDueDate = new Date();
            finalDueDate.setDate(outDate.getDate() + durationDays);
        }

        const loan = this.loanRepo.create({
            book,
            borrower,
            outDate,
            dueDate: finalDueDate,
            status: LoanStatus.ACTIVE
        });

        // Update book status
        book.status = BookStatus.LOANED;

        await this.bookRepo.save(book);
        return this.loanRepo.save(loan);
    }

    async returnBook(loanId: string, notes?: string) {
        const loan = await this.loanRepo.findOne({ where: { id: loanId }, relations: ['book'] });
        if (!loan) throw new NotFoundException('Préstamo no encontrado');

        if (loan.status === LoanStatus.RETURNED) throw new BadRequestException('El préstamo ya fue devuelto');

        loan.status = LoanStatus.RETURNED;
        loan.returnDate = new Date();

        // Update book status
        if (loan.book) {
            loan.book.status = BookStatus.AVAILABLE;
            if (notes) {
                // Append notes to condition or keep loan-specific notes somewhere? 
                // Currently Loan entity doesn't have notes field, Book as 'condition'
                // Let's assume we update book condition if notes provided, or just ignore for MVP
                const newCondition = loan.book.condition ? `${loan.book.condition} | Devolución: ${notes}` : `Devolución: ${notes}`;
                loan.book.condition = newCondition.slice(0, 255); // Simple truncate
            }
            await this.bookRepo.save(loan.book);
        }

        return this.loanRepo.save(loan);
    }

    async getActiveLoans(churchId: string) {
        return this.loanRepo.find({
            where: {
                book: { church: { id: churchId } },
                status: LoanStatus.ACTIVE
            },
            relations: ['book', 'borrower', 'borrower.person', 'book.ownerMember'],
            order: { outDate: 'DESC' }
        });
    }
}
