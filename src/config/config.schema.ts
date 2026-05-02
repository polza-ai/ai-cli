import { z } from 'zod';

export const configSchema = z.object({
  token: z.string().min(1, 'Токен обязателен'),
  userId: z.string().optional(),
  defaultModel: z.object({
    text: z.string().optional(),
    image: z.string().optional(),
    video: z.string().optional(),
  }).optional(),
  apiBaseUrl: z.string().url().default('https://polza.ai/api/v1'),
});

export type AiCliConfig = z.infer<typeof configSchema>;
