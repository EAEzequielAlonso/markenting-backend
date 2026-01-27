import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { CounselingService } from './counseling.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CareProcessType, CareNoteVisibility, CareProcessStatus } from '../common/enums';

@Controller('counseling')
@UseGuards(JwtAuthGuard)
export class CounselingController {
    constructor(private readonly counselingService: CounselingService) { }

    @Post()
    create(@Request() req, @Body() body: any) {
        // body: { type, counseleeId, motive }
        // req.user should have churchId and memberId (or we use userId as memberId if they are same)
        // Adjust based on actual User object structure. Assuming req.user.memberId exists or using req.user.id
        const memberId = req.user.memberId;
        const personId = req.user.personId;
        const roles = req.user.roles || [];
        return this.counselingService.createProcess(
            req.user.churchId,
            memberId,
            personId,
            roles,
            body.type,
            body.counseleeId,
            body.motive
        );
    }

    @Get()
    findAll(@Request() req) {
        const memberId = req.user.memberId;
        const roles = req.user.roles || [];
        return this.counselingService.findAll(memberId, roles);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        console.log('Controller findOne called for ID:', id);
        const memberId = req.user.memberId;
        const personId = req.user.personId;
        const roles = req.user.roles || [];
        return this.counselingService.findOne(id, memberId, personId, roles);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() body: { motive?: string, status?: CareProcessStatus }
    ) {
        return this.counselingService.updateProcess(id, body);
    }

    @Post(':id/notes')
    addNote(@Param('id') id: string, @Request() req, @Body() body: { content: string, visibility: CareNoteVisibility, title?: string, sessionId?: string }) {
        const memberId = req.user.memberId;
        return this.counselingService.addNote(
            id,
            memberId,
            body.content,
            body.visibility,
            body.title,
            body.sessionId
        );
    }

    @Patch('notes/:noteId')
    updateNote(@Param('noteId') noteId: string, @Request() req, @Body() body: any) {
        const memberId = req.user.memberId;
        return this.counselingService.updateNote(noteId, memberId, body);
    }

    @Delete('notes/:noteId')
    deleteNote(@Param('noteId') noteId: string, @Request() req) {
        const memberId = req.user.memberId;
        return this.counselingService.deleteNote(noteId, memberId);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Request() req, @Body() body: { status: CareProcessStatus }) {
        const memberId = req.user.memberId;
        return this.counselingService.updateStatus(id, memberId, body.status);
    }

    // --- SESSIONS ---

    @Post(':id/sessions')
    @Post(':id/sessions')
    createSession(
        @Param('id') id: string,
        @Request() req,
        @Body() body: {
            date: string,
            durationMinutes: number,
            topics?: string,
            location?: string,
            initialNote?: { content: string, visibility: CareNoteVisibility, title?: string }
        }
    ) {
        const memberId = req.user.memberId;
        return this.counselingService.createSession(
            id,
            memberId,
            new Date(body.date),
            body.durationMinutes,
            body.topics,
            body.location,
            body.initialNote
        );
    }

    @Get(':id/sessions')
    findAllSessions(@Param('id') id: string, @Request() req) {
        const memberId = req.user.memberId;
        const personId = req.user.personId;
        const roles = req.user.roles || [];
        return this.counselingService.findAllSessions(id, memberId, personId, roles);
    }

    // --- TASKS ---

    @Post('sessions/:sessionId/tasks')
    addTask(
        @Param('sessionId') sessionId: string,
        @Body() body: { description: string, title?: string }
    ) {
        return this.counselingService.addTask(sessionId, body.description, body.title);
    }

    @Patch('tasks/:taskId')
    updateTask(
        @Param('taskId') taskId: string,
        @Body() body: { description?: string, response?: string, feedback?: string, status?: any }
    ) {
        return this.counselingService.updateTask(taskId, body.description, body.response, body.feedback, body.status);
    }

    @Delete('tasks/:taskId')
    deleteTask(@Param('taskId') taskId: string) {
        return this.counselingService.deleteTask(taskId);
    }
}
