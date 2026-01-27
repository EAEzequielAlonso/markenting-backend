import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { DiscipleshipService } from './discipleship.service';
import { CreateDiscipleshipDto, CreateMeetingDto, CreateNoteDto, CreateTaskDto, UpdateTaskDto } from './dto/create-discipleship.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('discipleships')
@UseGuards(JwtAuthGuard)
export class DiscipleshipController {
    constructor(private readonly discipleshipService: DiscipleshipService) { }

    @Post()
    create(@Body() createDto: CreateDiscipleshipDto, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.create(createDto, req.user.memberId, req.user.roles || []);
    }

    @Get()
    findAll(@Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.findAll(req.user.memberId, req.user.roles || []);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.findOne(id, req.user.memberId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.update(id, updateDto, req.user.memberId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.discipleshipService.delete(id);
    }

    @Post(':id/meetings')
    createMeeting(@Param('id') id: string, @Body() createDto: CreateMeetingDto, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.createMeeting(id, createDto, req.user.memberId);
    }

    @Patch(':id/meetings/:meetingId')
    updateMeeting(@Param('id') id: string, @Param('meetingId') meetingId: string, @Body() updateDto: any, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.updateMeeting(meetingId, updateDto);
    }

    @Delete(':id/meetings/:meetingId')
    removeMeeting(@Param('id') id: string, @Param('meetingId') meetingId: string, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.deleteMeeting(meetingId);
    }

    @Post(':id/notes')
    createNote(@Param('id') id: string, @Body() createDto: CreateNoteDto, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.discipleshipService.createNote(id, createDto, req.user.memberId);
    }

    @Post(':id/tasks')
    createTask(@Param('id') id: string, @Body() createDto: CreateTaskDto, @Request() req) {
        // Task creation logic now requires meetingId which is in dto
        // Service handles context check
        return this.discipleshipService.createTask(id, createDto);
    }

    @Patch('tasks/:taskId')
    updateTask(@Param('taskId') taskId: string, @Body() updateDto: UpdateTaskDto) {
        return this.discipleshipService.updateTask(taskId, updateDto);
    }
}
