
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PeopleFunnelService } from './people-funnel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';

@Controller('invited-people')
@UseGuards(JwtAuthGuard)
export class InvitedPeopleController {
    constructor(private readonly service: PeopleFunnelService) { }

    @Get()
    findAll(
        @Query('q') query: string,
        @Query('includeArchived') includeArchived?: string
    ) {
        return this.service.search(query, includeArchived === 'true');
    }

    @Post()
    create(@Body() body: { firstName: string, lastName: string, email?: string, phone?: string }) {
        return this.service.createInvited(body);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() body: { firstName?: string, lastName?: string, email?: string, phone?: string }
    ) {
        return this.service.updateInvited(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.hardRemoveInvited(id);
    }

    @Put(':id/archive')
    archive(@Param('id') id: string) {
        return this.service.archiveInvited(id);
    }

    @Post(':id/promote-visitor')
    promoteToVisitor(
        @Param('id') id: string,
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any
    ) {
        return this.service.promoteToFollowUp(id, churchId, user.memberId);
    }
}
