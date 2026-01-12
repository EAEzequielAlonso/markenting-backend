import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { AiProvider } from './providers/ai-provider.interface';
import { PromptRegistry, PromptType } from './prompt-registry.service';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class AiService {
    private aiEnabled: boolean;

    constructor(
        @Inject('AI_PROVIDER') private aiProvider: AiProvider,
        private promptRegistry: PromptRegistry,
        private configService: ConfigService,
        @InjectRepository(Company)
        private companyRepository: Repository<Company>
    ) {
        this.aiEnabled = this.configService.get<string>('AI_ENABLED') !== 'false';
    }

    async generateResponse(
        type: PromptType,
        variables: Record<string, string>,
        companyId?: string,
        model?: string,
    ): Promise<string> {
        if (!this.aiEnabled) {
            return 'IA desactivada por configuración (Feature Flag).';
        }

        // 1. Verificar créditos si hay companyId
        if (companyId) {
            const company = await this.companyRepository.findOne({ where: { id: companyId } });
            if (!company || company.credits <= 0) {
                throw new InternalServerErrorException('Créditos de IA insuficientes para esta empresa.');
            }
        }

        const prompt = this.promptRegistry.getPrompt(type, variables);

        try {
            const response = await this.aiProvider.generateText(prompt, model);

            // 2. Actualizar créditos consumidos
            if (companyId && response.usage) {
                const tokensUsed = response.usage.totalTokens;
                await this.companyRepository.update(companyId, {
                    credits: () => `credits - ${tokensUsed}`,
                    aiCreditsUsed: () => `aiCreditsUsed + ${tokensUsed}`
                });
                console.log(`[AI Usage] Company: ${companyId}, Tokens: ${tokensUsed}`);
            }

            return response.content;
        } catch (error) {
            console.error('Error in AiService:', error.message);

            // Check for Insufficient Balance (HTTP 402)
            if (error.status === 402 || error.message?.includes('402') || error.message?.includes('Insufficient Balance')) {
                throw new InternalServerErrorException('IA: Saldo insuficiente o cuota excedida en el proveedor.');
            }

            throw new InternalServerErrorException('Error al contactar con el proveedor de IA.');
        }
    }

    async chat(
        messages: { role: 'system' | 'user' | 'assistant', content: string }[],
        companyId?: string,
        model?: string
    ): Promise<string> {
        if (!this.aiEnabled) return 'IA desactivada.';

        // 1. Verificar créditos si hay companyId
        if (companyId) {
            const company = await this.companyRepository.findOne({ where: { id: companyId } });
            if (!company || company.credits <= 0) {
                throw new InternalServerErrorException('Créditos de IA insuficientes para esta empresa.');
            }
        }

        try {
            const response = await this.aiProvider.chat(messages, model);

            // 2. Actualizar créditos consumidos
            if (companyId && response.usage) {
                const tokensUsed = response.usage.totalTokens;
                await this.companyRepository.update(companyId, {
                    credits: () => `credits - ${tokensUsed}`,
                    aiCreditsUsed: () => `aiCreditsUsed + ${tokensUsed}`
                });
                console.log(`[AI Chat Usage] Company: ${companyId}, Tokens: ${tokensUsed}`);
            }

            return response.content;
        } catch (error: any) {
            console.error('Error in AiService Chat:', error.message);

            if (error.status === 402 || error.message?.includes('402') || error.message?.includes('Insufficient Balance')) {
                throw new InternalServerErrorException('IA: Saldo insuficiente o cuota excedida en el proveedor.');
            }

            throw new InternalServerErrorException('Error en el chat de IA.');
        }
    }
}
