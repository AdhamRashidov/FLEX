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
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z.coerce.boolean().default(false),
  GEMINI_API_KEY: z.string().optional(),
  SUPER_ADMIN_IDS: z.string().default(''),
  SUPERADMIN_USERNAME: z.string().default('adham_rashidov'),
  SUPERADMIN_PASSWORD: z.string().optional(),
  SUPERADMIN_PASWORD: z.string().optional(),
  SUPERADMIN_PHONE: z.string().default('+998991500136'),
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
  redis: {
    url: parsed.data.REDIS_URL,
    enabled: parsed.data.REDIS_ENABLED,
  },
  ai: {
    geminiApiKey: parsed.data.GEMINI_API_KEY,
  },
  superAdminIds: parsed.data.SUPER_ADMIN_IDS
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !isNaN(n) && n > 0),
  superAdmin: {
    username: parsed.data.SUPERADMIN_USERNAME,
    password: parsed.data.SUPERADMIN_PASSWORD || parsed.data.SUPERADMIN_PASWORD || 'Adham123!',
    phone: parsed.data.SUPERADMIN_PHONE,
  },
  cors: { origins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()) },
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
} as const;
