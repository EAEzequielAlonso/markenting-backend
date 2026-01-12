export interface AiResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface AiProvider {
    generateText(prompt: string, model?: string): Promise<AiResponse>;
    chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[], model?: string): Promise<AiResponse>;
}
