import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(Contact) private contactRepo: Repository<Contact>
    ) { }

    async create(data: Partial<Contact>, churchId: string) {
        const contact = this.contactRepo.create({
            ...data,
            church: { id: churchId }
        });
        return this.contactRepo.save(contact);
    }

    async findAll(churchId: string) {
        return this.contactRepo.find({ where: { church: { id: churchId } }, order: { createdAt: 'DESC' } });
    }

    async findOne(id: string) {
        return this.contactRepo.findOne({ where: { id } });
    }

    async findByEmail(email: string, churchId: string) {
        return this.contactRepo.findOne({ where: { email, church: { id: churchId } } });
    }
}
