import { AiProvider, AiResponse } from './ai-provider.interface';
import OpenAI from 'openai';

export class GroqProvider implements AiProvider {
    private client: OpenAI;

    constructor(apiKey: string, baseUrl: string = 'https://api.groq.com/openai/v1') {
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: baseUrl,
        });
    }

    async generateText(prompt: string, model: string = 'llama-3.1-8b-instant'): Promise<AiResponse> {
        return this.chat([{ role: 'user', content: prompt }], model);
    }

    async chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[], model: string = 'llama-3.1-8b-instant'): Promise<AiResponse> {
        const response = await this.client.chat.completions.create({
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
