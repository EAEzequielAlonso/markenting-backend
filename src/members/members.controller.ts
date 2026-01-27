import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentChurch } from '../common/decorators';
import { EcclesiasticalRole, MembershipStatus } from '../common/enums';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Post()
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER)
    @ApiOperation({ summary: 'Create a new member' })
    create(@Body() createMemberDto: CreateMemberDto, @CurrentChurch() churchId: string) {
        return this.membersService.create(createMemberDto, churchId);
    }

    @Post('request-access')
    @ApiOperation({ summary: 'Request to join a church' })
    requestAccess(@Body('churchId') churchId: string, @Request() req) {
        return this.membersService.requestJoin(req.user.userId, req.user.personId, churchId);
    }

    @Get('search')
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER, EcclesiasticalRole.DEACON)
    @ApiOperation({ summary: 'Search members' })
    search(@CurrentChurch() churchId: string, @Query('q') query: string) {
        return this.membersService.search(churchId, query);
    }

    @Get()
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER, EcclesiasticalRole.DEACON)
    @ApiOperation({ summary: 'List all members' })
    @ApiQuery({ name: 'status', enum: MembershipStatus, required: false })
    findAll(@CurrentChurch() churchId: string, @Query('status') status?: MembershipStatus) {
        return this.membersService.findAll(churchId, status);
    }

    @Get(':id')
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER, EcclesiasticalRole.DEACON)
    @ApiOperation({ summary: 'Get a member' })
    findOne(@Param('id') id: string, @CurrentChurch() churchId: string) {
        return this.membersService.findOne(id, churchId);
    }

    @Get(':id/details')
    @Roles(EcclesiasticalRole.PASTOR, EcclesiasticalRole.LEADER)
    @ApiOperation({ summary: 'Get member detailed info' })
    getMemberDetails(@Param('id') id: string, @CurrentChurch() churchId: string) {
        return this.membersService.getMemberDetails(id, churchId);
    }

    @Patch(':id')
    @Roles(EcclesiasticalRole.PASTOR)
    @ApiOperation({ summary: 'Update a member' })
    update(@Param('id') id: string, @Body() updateData: any, @CurrentChurch() churchId: string) {
        return this.membersService.update(id, updateData, churchId);
    }

    @Delete(':id')
    @Roles(EcclesiasticalRole.PASTOR)
    @ApiOperation({ summary: 'Remove a member' })
    remove(@Param('id') id: string, @CurrentChurch() churchId: string) {
        return this.membersService.remove(id, churchId);
    }
}
