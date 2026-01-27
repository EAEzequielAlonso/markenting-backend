import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact } from './entities/contact.entity';
import { Church } from '../churches/entities/church.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Contact, Church])],
    controllers: [ContactsController],
    providers: [ContactsService],
    exports: [ContactsService]
})
export class ContactsModule { }
