import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentChurch } from '../common/decorators';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { EcclesiasticalRole } from '../common/enums';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Post()
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER)
    create(@Body() data: any, @CurrentChurch() churchId: string) {
        return this.contactsService.create(data, churchId);
    }

    @Get()
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER, EcclesiasticalRole.DEACON)
    findAll(@CurrentChurch() churchId: string) {
        return this.contactsService.findAll(churchId);
    }
}
