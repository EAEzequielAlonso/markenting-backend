import { AiProvider, AiResponse } from './ai-provider.interface';
import axios from 'axios';

export class OllamaProvider implements AiProvider {
    private baseUrl: string;
    private defaultModel: string;

    constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'mistral') {
        this.baseUrl = baseUrl;
        this.defaultModel = defaultModel;
    }

    async generateText(prompt: string, model: string = 'mistral'): Promise<AiResponse> {
        return this.chat([{ role: 'user', content: prompt }], model);
    }

    async chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[], model: string = 'mistral'): Promise<AiResponse> {
        const targetModel = model || this.defaultModel;

        try {
            const response = await axios.post(`${this.baseUrl}/api/chat`, {
                model: targetModel,
                messages: messages,
                stream: false,
                options: {
                    temperature: 0.7
                }
            });

            return {
                content: response.data.message?.content || '',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } // Ollama doesn't return usage easily in this endpoint
            };
        } catch (error) {
            console.error('Error connecting to Ollama:', error.message);
            return {
                content: 'Error: No se pudo conectar con Ollama.',
            };
        }
    }
}
