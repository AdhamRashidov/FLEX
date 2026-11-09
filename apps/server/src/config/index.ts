import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BOT_TOKEN: z.string().optional(),
  WEBHOOK_DOMAIN: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  MEDIA_STORAGE: z.enum(['local', 'cloudflare_r2', 'telegram_cdn']).default('local'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Muhit o\'zgaruvchilari xatosi:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  db: { url: parsed.data.DATABASE_URL },
  jwt: { secret: parsed.data.JWT_SECRET, expiresIn: parsed.data.JWT_EXPIRES_IN },
  telegram: {
    botToken: parsed.data.BOT_TOKEN,
    webhookDomain: parsed.data.WEBHOOK_DOMAIN,
    webhookSecret: parsed.data.WEBHOOK_SECRET,
  },
  media: { storage: parsed.data.MEDIA_STORAGE },
  cors: { origins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()) },
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
} as const;
