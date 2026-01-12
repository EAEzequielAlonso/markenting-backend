import { AiProvider, AiResponse } from './ai-provider.interface';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider implements AiProvider {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private apiKey: string) {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
    }

    async generateText(prompt: string, modelName: string = 'gemini-1.5-pro'): Promise<AiResponse> {
        try {
            const model = this.genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Usage tracking is not directly available in the same format as OpenAI in all simple responses,
            // but we can estimate or check if response.usageMetadata exists.
            const usageMetadata = response.usageMetadata;

            return {
                content: text,
                usage: {
                    promptTokens: usageMetadata?.promptTokenCount || 0,
                    completionTokens: usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: usageMetadata?.totalTokenCount || 0
                }
            };
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error(`Gemini Error: ${error.message || error}`);
        }
    }

    async chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[], modelName: string = 'gemini-1.5-pro'): Promise<AiResponse> {
        try {
            const model = this.genAI.getGenerativeModel({ model: modelName });

            // Convert standard messages to Gemini format
            // System instructions are passed to getGenerativeModel in newer SDKs, 
            // but for simplicity in chat history we'll adapt.
            // Gemini roles: 'user', 'model' (assistant). System prompts are handled differently.

            const history = messages
                .filter(m => m.role !== 'system') // Filter out system for history, usually passed as config
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

            const systemMessage = messages.find(m => m.role === 'system');

            // Re-init model if system instruction is needed (v1.5+ feature)
            const chatModel = systemMessage
                ? this.genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: systemMessage.content
                })
                : model;

            const chat = chatModel.startChat({
                history: history.slice(0, -1), // All except last
                generationConfig: {
                    maxOutputTokens: 2048,
                },
            });

            const lastMessage = messages[messages.length - 1];
            const result = await chat.sendMessage(lastMessage.content);
            const response = await result.response;

            const usageMetadata = response.usageMetadata;

            return {
                content: response.text(),
                usage: {
                    promptTokens: usageMetadata?.promptTokenCount || 0,
                    completionTokens: usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: usageMetadata?.totalTokenCount || 0
                }
            };
        } catch (error) {
            console.error('Gemini Chat Error:', error);
            throw new Error(`Gemini Chat Error: ${error.message || error}`);
        }
    }
}
