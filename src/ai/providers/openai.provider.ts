import { AiProvider, AiResponse } from './ai-provider.interface';
import OpenAI from 'openai';

export class OpenAiProvider implements AiProvider {
    private openai: OpenAI;

    constructor(apiKey: string) {
        this.openai = new OpenAI({ apiKey });
    }

    async generateText(prompt: string, model: string = 'gpt-4o-mini'): Promise<AiResponse> {
        return this.chat([{ role: 'user', content: prompt }], model);
    }

    async chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[], model: string = 'gpt-4o-mini'): Promise<AiResponse> {
        const response = await this.openai.chat.completions.create({
            model: model,
            messages: messages as any,
            temperature: 0.7,
        });

        return {
            content: response.choices[0].message.content || '',
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            }
        };
    }
}
