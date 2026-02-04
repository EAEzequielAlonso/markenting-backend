import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamiliesController {
    constructor(private readonly familiesService: FamiliesService) { }

    @Post()
    create(@Body() createFamilyDto: CreateFamilyDto, @Request() req) {
        return this.familiesService.create(createFamilyDto, req.user.churchId);
    }

    @Get()
    findAll(@Request() req) {
        return this.familiesService.findAll(req.user.churchId);
    }

    @Get('my-family')
    findMyFamily(@Request() req) {
        if (!req.user.memberId) return null;
        return this.familiesService.findByMember(req.user.memberId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.familiesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFamilyDto: UpdateFamilyDto) {
        return this.familiesService.update(id, updateFamilyDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.familiesService.remove(id);
    }

    @Post(':id/members')
    addMember(
        @Param('id') id: string,
        @Body() body: { memberId: string, role: string }
    ) {
        return this.familiesService.addMember(id, body.memberId, body.role);
    }

    @Delete(':id/members/:memberId')
    removeMember(
        @Param('id') id: string,
        @Param('memberId') memberId: string
    ) {
        return this.familiesService.removeMember(id, memberId);
    }
}
