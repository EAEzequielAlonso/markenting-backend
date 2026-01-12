import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './providers/openai.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { GroqProvider } from './providers/groq.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { PromptRegistry } from './prompt-registry.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { AiActivity } from './entities/ai-activity.entity';
import { AdSuggestion } from '../ads/entities/ad-suggestion.entity';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';

@Global()
@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([Company, AiActivity, AdSuggestion])],
    controllers: [IntelligenceController],
    providers: [
        AiService,
        PromptRegistry,
        IntelligenceService,
        {
            provide: 'AI_PROVIDER',
            useFactory: (configService: ConfigService) => {
                const providerType = configService.get<string>('AI_PROVIDER') || 'groq';

                switch (providerType) {
                    case 'ollama':
                        const baseUrl = configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
                        const model = configService.get<string>('OLLAMA_MODEL') || 'mistral';
                        return new OllamaProvider(baseUrl, model);
                    case 'groq':
                    case 'deepseek':
                        const groqKey = configService.get<string>('GROQ_API_KEY') || configService.get<string>('DEEPSEEK_API_KEY') || 'dummy';
                        return new GroqProvider(groqKey);
                    case 'gemini':
                        const geminiKey = configService.get<string>('GEMINI_API_KEY') || 'dummy';
                        return new GeminiProvider(geminiKey);
                    case 'openai':
                    default:
                        const apiKey = configService.get<string>('OPENAI_API_KEY') || 'dummy';
                        return new OpenAiProvider(apiKey);
                }
            },
            inject: [ConfigService],
        },
    ],
    exports: [AiService, PromptRegistry],
})
export class AiModule { }
