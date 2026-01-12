import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai/intelligence')
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
    constructor(private readonly intelligenceService: IntelligenceService) { }

    @Get('activity')
    async getActivity(@Request() req) {
        if (!req.user || !req.user.companyId) {
            return [];
        }
        return this.intelligenceService.getRecentActivity(req.user.companyId);
    }

    @Get('suggestions')
    async getSuggestions(@Request() req) {
        if (!req.user || !req.user.companyId) {
            return [];
        }
        return this.intelligenceService.getUnifiedSuggestions(req.user.companyId);
    }
}
