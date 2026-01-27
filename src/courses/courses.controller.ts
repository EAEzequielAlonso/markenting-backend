import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UnauthorizedException, ForbiddenException, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, CreateSessionDto, AddParticipantDto, AddGuestDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EcclesiasticalRole, ProgramType } from 'src/common/enums';
import { Roles } from 'src/auth/guards/roles.guard';

@Controller('courses')
@UseGuards(JwtAuthGuard)
@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    private checkAdminOrPastor(roles: string[]) {
        if (!roles.includes('ADMIN_APP') && !roles.includes('PASTOR')) {
            throw new ForbiddenException('Requiere privilegios de Administrador o Pastor');
        }
    }

    @Post()
    create(@Body() createDto: CreateCourseDto, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.create(createDto, req.user.memberId);
    }

    @Get()
    findAll(@Request() req, @Query('type') type?: ProgramType) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        return this.coursesService.findAll(req.user.memberId, req.user.roles || [], type);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.coursesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateCourseDto, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.delete(id);
    }

    @Post(':id/sessions')
    createSession(@Param('id') id: string, @Body() createDto: CreateSessionDto, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.createSession(id, createDto);
    }

    @Post(':id/participants')
    addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.addParticipant(id, dto);
    }

    @Delete('participants/:participantId')
    removeParticipant(@Param('participantId') participantId: string, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.removeParticipant(participantId);
    }

    @Post(':id/guests')
    addGuest(@Param('id') id: string, @Body() dto: AddGuestDto, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.addGuest(id, dto);
    }

    @Delete('guests/:guestId')
    removeGuest(@Param('guestId') guestId: string, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.removeGuest(guestId);
    }

    @Patch('guests/:guestId')
    updateGuest(@Param('guestId') guestId: string, @Body() dto: Partial<AddGuestDto>, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.updateGuest(guestId, dto);
    }

    // --- ATTENDANCE ---

    @Post('sessions/:id/attendance')
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER)
    registerAttendance(@Param('id') sessionId: string, @Body() items: any[]) {
        return this.coursesService.registerAttendance(sessionId, items);
    }

    @Get(':id/stats')
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER)
    getStats(@Param('id') id: string) {
        return this.coursesService.getStats(id);
    }

    @Get('sessions/:id/attendance')
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER)
    getAttendance(@Param('id') sessionId: string) {
        return this.coursesService.getAttendance(sessionId);
    }

    @Patch('sessions/:sessionId')
    updateSession(@Param('sessionId') sessionId: string, @Body() dto: Partial<CreateSessionDto>, @Request() req) {
        this.checkAdminOrPastor(req.user.roles || []);
        return this.coursesService.updateSession(sessionId, dto);
    }
}
