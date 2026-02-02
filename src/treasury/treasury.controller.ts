import { Controller, Get, Post, Body, UseGuards, Query, Patch, Param, Delete } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { User } from '../users/entities/user.entity';
import { EcclesiasticalRole, FunctionalRole } from '../common/enums';

import { TreasuryReportsService } from './reports.service';
import { Response } from 'express';
import { Res } from '@nestjs/common';

@Controller('treasury')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(FunctionalRole.TREASURER)
export class TreasuryController {
    constructor(
        private readonly treasuryService: TreasuryService,
        private readonly reportsService: TreasuryReportsService
    ) { }

    @Post('transactions')
    createTransaction(@Body() data: any, @CurrentChurch() churchId: string, @CurrentUser() user: User) {
        return this.treasuryService.createTransaction(data, churchId, user.id);
    }

    @Get('transactions')
    getTransactions(@CurrentChurch() churchId: string) {
        return this.treasuryService.getTransactions(churchId);
    }

    @Patch('transactions/:id')
    updateTransaction(@Param('id') id: string, @Body() data: any, @CurrentUser() user: User) {
        return this.treasuryService.updateTransaction(id, data, user.id);
    }

    @Get('transactions/:id/audit')
    getAuditLogs(@Param('id') id: string) {
        return this.treasuryService.getAuditLogs(id);
    }

    @Delete('transactions/:id')
    deleteTransaction(@Param('id') id: string, @CurrentUser() user: User) {
        return this.treasuryService.deleteTransaction(id, user.id);
    }

    @Get('reports/ppt')
    async getPPTReport(@CurrentChurch() churchId: string, @Res() res: Response) {
        const transactions = await this.treasuryService.getTransactions(churchId);
        const accounts = await this.treasuryService.findAllAccounts(churchId);

        const buffer = await this.reportsService.generateMonthlyReport('Iglesia Demo', transactions, accounts);

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': 'attachment; filename=reporte-mensual.pptx',
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }

    @Post('accounts')
    createAccount(@Body() data: any, @CurrentChurch() churchId: string) {
        return this.treasuryService.createAccount(data, churchId);
    }

    @Patch('accounts/:id')
    updateAccount(@Param('id') id: string, @Body() data: any) {
        return this.treasuryService.updateAccount(id, data);
    }

    @Delete('accounts/:id')
    deleteAccount(@Param('id') id: string) {
        return this.treasuryService.deleteAccount(id);
    }

    @Get('accounts')
    getAccounts(@CurrentChurch() churchId: string) {
        return this.treasuryService.findAllAccounts(churchId);
    }

    // --- Budgets ---
    @Post('budgets')
    createBudget(@Body() data: any, @CurrentChurch() churchId: string) {
        return this.treasuryService.createBudget(data, churchId);
    }

    @Get('budgets')
    getBudgets(@CurrentChurch() churchId: string, @Query('year') year?: number) {
        return this.treasuryService.getBudgets(churchId, year);
    }

    @Delete('budgets/:id')
    deleteBudget(@Param('id') id: string) {
        return this.treasuryService.deleteBudget(id);
    }
}
