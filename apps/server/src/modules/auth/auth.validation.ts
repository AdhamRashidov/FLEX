import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'Telegram initData parametri talab qilinadi'),
  storeSlug: z.string().optional(),
});

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;
