import { Controller, Get, Body, Patch, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) { }

    @Get('my-company')
    async findMyCompany(@Request() req) {
        console.log('[CompaniesController] findMyCompany for user:', req.user.userId, 'companyId:', req.user.companyId);
        if (!req.user.companyId) {
            console.warn('[CompaniesController] User has no companyId in JWT');
        }
        return this.companiesService.findOne(req.user.companyId);
    }

    @Patch('my-company')
    async updateMyCompany(@Request() req, @Body() updateCompanyDto: UpdateCompanyDto) {
        return this.companiesService.update(req.user.companyId, updateCompanyDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto, @Request() req) {
        // Seguridad: Verificar que el usuario pertenece a la compañía que intenta modificar
        if (req.user.companyId !== id) {
            throw new ForbiddenException('You can only update your own company');
        }
        return this.companiesService.update(id, updateCompanyDto);
    }
}
