import * as Joi from 'joi';

export const validationSchema = Joi.object({
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    FRONTEND_URL: Joi.string().required(),
    AI_ENABLED: Joi.boolean().default(true),
    AI_PROVIDER: Joi.string().valid('groq', 'deepseek', 'gemini', 'ollama', 'openai').default('groq'),
    GROQ_API_KEY: Joi.string().when('AI_PROVIDER', {
        is: 'groq',
        then: Joi.required(),
    }),
    AUTH0_AUDIENCE: Joi.string().required(),
    AUTH0_ISSUER_URL: Joi.string().required(),
    AUTH0_CLIENT_ID: Joi.string().required(),
});
