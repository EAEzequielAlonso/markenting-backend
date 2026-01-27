import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgendaService } from './agenda.service';

@Controller('agenda')
@UseGuards(JwtAuthGuard)
export class AgendaController {
    constructor(private readonly agendaService: AgendaService) { }

    @Get()
    async getMyAgenda(@Request() req) {
        const userId = req.user.userId;
        const personId = req.user.personId;
        const memberId = req.user.memberId;
        const churchId = req.user.churchId;

        return this.agendaService.getUpcomingActivities(personId, memberId, churchId);
    }

    @Post()
    async createEvent(@Request() req, @Body() createDto: CreateCalendarEventDto) {
        const { userId, personId, memberId, churchId, permissions } = req.user;
        return this.agendaService.createEvent(createDto, personId, churchId, permissions || [], memberId);
    }
}
