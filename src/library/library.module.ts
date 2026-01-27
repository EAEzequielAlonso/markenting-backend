import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { Book } from './entities/book.entity';
import { Loan } from './entities/loan.entity';
import { ChurchMember } from '../members/entities/church-member.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Book, Loan, ChurchMember])],
    controllers: [LibraryController],
    providers: [LibraryService],
    exports: [LibraryService]
})
export class LibraryModule { }
