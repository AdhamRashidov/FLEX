import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'Telegram initData parametri talab qilinadi'),
  storeSlug: z.string().optional(),
});

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;

export const credentialsAuthSchema = z.object({
  login: z.string().min(3, 'Telefon raqam yoki login kamida 3 belgidan iborat bo\'lishi kerak').max(100),
  password: z.string().min(4, 'Parol kamida 4 belgidan iborat bo\'lishi kerak').max(100),
});

export type CredentialsAuthInput = z.infer<typeof credentialsAuthSchema>;

