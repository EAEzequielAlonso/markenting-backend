import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { FollowUpStatus } from '../common/enums';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard)
export class FollowUpsController {
    constructor(private readonly service: FollowUpsService) { }

    @Post()
    create(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Body() body: { firstName: string, lastName: string, phone?: string, email?: string, firstVisitDate?: Date }
    ) {
        return this.service.create(churchId, user.memberId, body);
    }

    @Get()
    findAll(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Query('status') status?: string
    ) {
        return this.service.findAll(churchId, user.memberId, user.roles, status);
    }

    @Get('search')
    search(
        @CurrentChurch() churchId: string,
        @Query('q') q: string
    ) {
        return this.service.search(churchId, q);
    }

    @Put(':id/assign')
    assign(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: { memberId: string | null }
    ) {
        return this.service.assignMember(id, body.memberId, user.roles);
    }

    @Post(':id/promote-member')
    promote(
        @Param('id') id: string,
        @CurrentUser() user: any
    ) {
        return this.service.promoteToMember(id, user.roles);
    }

    @Put(':id/status')
    setStatus(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: { status: FollowUpStatus }
    ) {
        return this.service.setStatus(id, body.status, user.roles);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: { firstName?: string, lastName?: string, email?: string, phone?: string, status?: FollowUpStatus }
    ) {
        return this.service.update(id, body, user.roles);
    }

    @Delete(':id')
    remove(
        @Param('id') id: string,
        @CurrentUser() user: any
    ) {
        return this.service.remove(id, user.roles);
    }
}
