import { z } from 'zod';
import { loginIdentifierSchema, strongPasswordSchema } from '@flex/shared';

export const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'Telegram initData parametri talab qilinadi'),
  storeSlug: z.string().optional(),
});

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;

/**
 * Login uchun qat'iy sxema (O'zbekiston telefon raqami yoki username)
 */
export const credentialsAuthSchema = z.object({
  login: loginIdentifierSchema,
  password: z
    .string()
    .min(6, 'Parol kamida 6 belgidan iborat bo\'lishi shart')
    .max(100, 'Parol ko\'pi bilan 100 belgidan oshmasligi kerak'),
});

export type CredentialsAuthInput = z.infer<typeof credentialsAuthSchema>;

/**
 * Yangi foydalanuvchi/admin ro'yxatdan o'tkazish yoki parol o'zgartirish sxemasi (Strong Password)
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Eski parol kiritilishi shart'),
  newPassword: strongPasswordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
