import { Controller, Get, Post, Body, Param, UseGuards, Query, Put, Delete, Patch, Request } from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { EcclesiasticalRole, FunctionalRole } from '../common/enums';
import { CurrentChurch } from '../common/decorators';

@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
    constructor(private readonly libraryService: LibraryService) { }

    @Get('books')
    findAll(
        @CurrentChurch() churchId: string,
        @Query('search') search?: string
    ) {
        return this.libraryService.findAllBooks(churchId, search);
    }

    @Post('books')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    createBook(
        @CurrentChurch() churchId: string,
        @Body() body: any // TODO DTO
    ) {
        return this.libraryService.createBook(churchId, body);
    }

    @Put('books/:id')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    updateBook(@Param('id') id: string, @Body() body: any) {
        return this.libraryService.updateBook(id, body);
    }

    @Delete('books/:id')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    deleteBook(@Param('id') id: string) {
        return this.libraryService.deleteBook(id);
    }

    @Get('loans/active')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    getActiveLoans(@CurrentChurch() churchId: string) {
        return this.libraryService.getActiveLoans(churchId);
    }

    @Post('loans/request')
    requestLoan(
        @Body() body: { bookId: string, durationDays?: number },
        @Request() req
    ) {
        // User requests for themselves (memberId from token)
        return this.libraryService.requestLoan(body.bookId, req.user.memberId, body.durationDays);
    }

    @Post('loans/:id/approve')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    approveLoan(@Param('id') loanId: string) {
        return this.libraryService.approveLoan(loanId);
    }

    @Post('loans/:id/reject')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    rejectLoan(@Param('id') loanId: string) {
        return this.libraryService.rejectLoan(loanId);
    }

    @Post('loans')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    loanBook(
        @Body() body: { bookId: string, borrowerMemberId: string, durationDays?: number, dueDate?: string }
    ) {
        return this.libraryService.loanBook(body.bookId, body.borrowerMemberId, body.durationDays, body.dueDate);
    }

    @Post('loans/:id/return')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    returnBook(@Param('id') loanId: string) {
        return this.libraryService.returnBook(loanId);
    }
}
