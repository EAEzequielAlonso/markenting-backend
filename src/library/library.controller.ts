import { Controller, Get, Post, Body, Param, UseGuards, Query, Put, Delete } from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { BookOwnershipType } from '../common/enums/library.enums';

@Controller('library')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LibraryController {
    constructor(private readonly libraryService: LibraryService) { }

    @Get('books')
    @RequirePermissions(AppPermission.LIBRARY_VIEW)
    findAll(
        @CurrentChurch() churchId: string,
        @Query('search') search?: string
    ) {
        return this.libraryService.findAllBooks(churchId, search);
    }

    @Post('books')
    @RequirePermissions(AppPermission.LIBRARY_MANAGE_BOOKS)
    createBook(
        @CurrentChurch() churchId: string,
        @Body() body: any // TODO DTO
    ) {
        return this.libraryService.createBook(churchId, body);
    }

    @Put('books/:id')
    @RequirePermissions(AppPermission.LIBRARY_MANAGE_BOOKS)
    updateBook(@Param('id') id: string, @Body() body: any) {
        return this.libraryService.updateBook(id, body);
    }

    @Delete('books/:id')
    @RequirePermissions(AppPermission.LIBRARY_MANAGE_BOOKS)
    deleteBook(@Param('id') id: string) {
        return this.libraryService.deleteBook(id);
    }

    @Get('loans/active')
    @RequirePermissions(AppPermission.LIBRARY_MANAGE_LOANS)
    getActiveLoans(@CurrentChurch() churchId: string) {
        return this.libraryService.getActiveLoans(churchId);
    }

    @Post('loans')
    @RequirePermissions(AppPermission.LIBRARY_MANAGE_LOANS)
    loanBook(
        @Body() body: { bookId: string, borrowerMemberId: string, durationDays?: number, dueDate?: string }
    ) {
        return this.libraryService.loanBook(body.bookId, body.borrowerMemberId, body.durationDays, body.dueDate);
    }

    @Post('loans/:id/return')
    @RequirePermissions(AppPermission.LIBRARY_MANAGE_LOANS)
    returnBook(@Param('id') loanId: string) {
        return this.libraryService.returnBook(loanId);
    }
}
