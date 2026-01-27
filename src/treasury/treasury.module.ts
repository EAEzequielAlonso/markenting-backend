import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { TreasuryTransaction } from './entities/treasury-transaction.entity';
import { Account } from './entities/account.entity';
import { TreasuryAuditLog } from './entities/treasury-audit-log.entity';
import { Budget } from './entities/budget.entity';
import { Ministry } from '../ministries/entities/ministry.entity';

import { TreasuryReportsService } from './reports.service';

@Module({
    imports: [TypeOrmModule.forFeature([TreasuryTransaction, Account, Budget, Ministry, TreasuryAuditLog])],
    controllers: [TreasuryController],
    providers: [TreasuryService, TreasuryReportsService],
    exports: [TreasuryService],
})
export class TreasuryModule { }
