import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UnauthorizedException, ForbiddenException, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, CreateSessionDto, AddParticipantDto, AddGuestDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EcclesiasticalRole, FunctionalRole, ProgramType, SystemRole } from '../common/enums';
import { Roles } from 'src/auth/guards/roles.guard';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    private checkCanManage(roles: string[], ecclesiasticalRole?: string) {
        const isSystemAdmin = roles.includes(SystemRole.ADMIN_APP);
        const isChurchAdmin = roles.includes(FunctionalRole.ADMIN_CHURCH);
        const isMinistryLeader = roles.includes(FunctionalRole.MINISTRY_LEADER);
        const isPastor = ecclesiasticalRole === EcclesiasticalRole.PASTOR;

        if (!isSystemAdmin && !isChurchAdmin && !isPastor && !isMinistryLeader) {
            throw new ForbiddenException('No tiene permisos para gestionar cursos o actividades');
        }
    }

    @Post()
    create(@Body() createDto: CreateCourseDto, @Request() req) {
        if (!req.user.memberId) {
            console.error('CoursesController.create: Missing memberId in req.user', req.user);
            throw new UnauthorizedException('Usuario no tiene miembro asociado');
        }
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.create(createDto, req.user.memberId);
    }

    @Get()
    findAll(@Request() req, @Query('type') type?: ProgramType) {
        if (!req.user.memberId) {
            console.error('[CoursesController] (findAll) Missing memberId in request', {
                userId: req.user.userId,
                email: req.user.email
            });
            throw new UnauthorizedException('Debe estar activamente vinculado a una iglesia (memberId missing)');
        }
        return this.coursesService.findAll(req.user.memberId, req.user.roles || [], type);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.coursesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateCourseDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.delete(id);
    }

    @Post(':id/sessions')
    createSession(@Param('id') id: string, @Body() createDto: CreateSessionDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.createSession(id, createDto);
    }

    @Post(':id/participants')
    addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.addParticipant(id, dto);
    }

    @Delete('participants/:participantId')
    removeParticipant(@Param('participantId') participantId: string, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.removeParticipant(participantId);
    }

    @Post(':id/guests')
    addGuest(@Param('id') id: string, @Body() dto: AddGuestDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.addGuest(id, dto);
    }

    @Delete('guests/:guestId')
    removeGuest(@Param('guestId') guestId: string, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.removeGuest(guestId);
    }

    @Patch('guests/:guestId')
    updateGuest(@Param('guestId') guestId: string, @Body() dto: Partial<AddGuestDto>, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.updateGuest(guestId, dto);
    }

    // --- ATTENDANCE ---

    @Post('sessions/:id/attendance')
    @Roles(EcclesiasticalRole.PASTOR, FunctionalRole.MINISTRY_LEADER)
    registerAttendance(@Param('id') sessionId: string, @Body() items: any[]) {
        return this.coursesService.registerAttendance(sessionId, items);
    }

    @Get(':id/stats')
    @Roles(EcclesiasticalRole.PASTOR, FunctionalRole.MINISTRY_LEADER)
    getStats(@Param('id') id: string) {
        return this.coursesService.getStats(id);
    }

    @Get('sessions/:id/attendance')
    @Roles(EcclesiasticalRole.PASTOR, FunctionalRole.MINISTRY_LEADER)
    getAttendance(@Param('id') sessionId: string) {
        return this.coursesService.getAttendance(sessionId);
    }

    @Patch('sessions/:sessionId')
    updateSession(@Param('sessionId') sessionId: string, @Body() dto: Partial<CreateSessionDto>, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.coursesService.updateSession(sessionId, dto);
    }
}
