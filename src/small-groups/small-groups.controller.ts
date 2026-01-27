import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { SmallGroupsService } from './small-groups.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Placeholder for Guard

import { AgendaService } from '../agenda/agenda.service';

@Controller('small-groups')
// @UseGuards(JwtAuthGuard) // Enable when Auth is ready
export class SmallGroupsController {
    constructor(
        private readonly smallGroupsService: SmallGroupsService,
        private readonly agendaService: AgendaService
    ) { }

    @Post()
    create(@Body() createDto: any, @Request() req) {
        // Assumption: req.user.churchId exists (middleware/guard logic)
        // For MVP prototyping, we might need to pass churchId in body or mock it
        const churchId = req.user?.churchId || createDto.churchId;
        return this.smallGroupsService.create(createDto, churchId);
    }

    @Get()
    findAll(@Request() req) {
        const churchId = req.user?.churchId || req.query.churchId;
        return this.smallGroupsService.findAll(churchId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.smallGroupsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: any) {
        return this.smallGroupsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.smallGroupsService.remove(id);
    }

    @Post(':id/members')
    addMember(@Param('id') id: string, @Body('memberId') memberId: string) {
        return this.smallGroupsService.addMember(id, memberId);
    }

    @Delete(':id/members/:memberId')
    removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
        return this.smallGroupsService.removeMember(id, memberId);
    }

    @Post('events/:eventId/attendance')
    async markAttendance(@Param('eventId') eventId: string, @Body() body: { personIds: string[] }) {
        return this.agendaService.markAttendance(eventId, body.personIds);
    }
}
