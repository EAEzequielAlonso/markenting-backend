import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AiService } from '../ai/ai.service';
import { PromptType } from '../ai/prompt-registry.service';

@Injectable()
export class CompaniesService {
    constructor(
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        private aiService: AiService,
    ) { }

    async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
        const company = await this.companiesRepository.preload({
            id: id,
            ...updateCompanyDto,
        });

        if (!company) {
            throw new NotFoundException(`Company #${id} not found`);
        }

        // Si se marca como completado y no tiene estrategia, generarla con IA
        if (updateCompanyDto.onboardingCompleted && !company.strategySummary) {
            const context = `Industria: ${company.industry}, Vende: ${company.productsDescription}, Ubicación: ${company.location}, Objetivo: ${company.goal}, Presupuesto: ${company.monthlyBudget}`;
            try {
                const strategy = await this.aiService.generateResponse(
                    PromptType.STRATEGIST,
                    { context },
                    company.id
                );
                company.strategySummary = strategy;
            } catch (error) {
                console.error('Error generating strategy:', error);
                // No bloqueamos el guardado si falla la IA, pero lo logueamos
            }
        }

        return this.companiesRepository.save(company);
    }

    async findOne(id: string): Promise<Company> {
        if (!id) {
            throw new NotFoundException(`Company ID not provided in request context`);
        }
        const company = await this.companiesRepository.findOne({ where: { id } });
        if (!company) {
            throw new NotFoundException(`Company #${id} not found`);
        }
        return company;
    }
}
