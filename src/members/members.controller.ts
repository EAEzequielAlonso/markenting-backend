import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CurrentChurch } from '../common/decorators';
import { ChurchRole } from '../entities/enums';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {

    @Get()
    @Roles(ChurchRole.ADMIN, ChurchRole.PASTOR)
    findAll(@CurrentChurch() churchId: string) {
        return {
            message: `Fetching all members for church ${churchId}`,
            churchId,
        };
    }

    @Get('my-profile')
    // No Role restriction, just valid member of the church
    getProfile(@CurrentChurch() churchId: string) {
        return {
            message: `Fetching profile for member of church ${churchId}`,
        };
    }
}
