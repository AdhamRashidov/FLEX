import { z } from 'zod';
import { StoreStatus } from '@flex/shared';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Do\'kon nomi kamida 2 ta belgidan iborat bo\'lishi kerak').max(255),
  slug: z
    .string()
    .min(2, 'Slug kamida 2 ta belgi bo\'lishi kerak')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug faqat kichik lotin harflari, raqamlar va chiziqchadan iborat bo\'lishi kerak'),
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  botToken: z.string().min(10, 'Bot tokeni yaroqsiz'),
  botUsername: z.string().max(255).optional(),
  webappUrl: z.string().url().optional(),
  deliveryEnabled: z.boolean().default(true),
  deliveryRadiusKm: z.number().min(0).max(100).default(5),
  deliveryPrice: z.number().int().min(0).default(0),
  minOrderAmount: z.number().int().min(0).default(0),
});

export const updateStoreSchema = createStoreSchema.partial().extend({
  logoUrl: z.string().url().nullable().optional(),
  status: z.enum([
    StoreStatus.ACTIVE,
    StoreStatus.INACTIVE,
    StoreStatus.SUSPENDED,
    StoreStatus.MAINTENANCE,
  ]).optional(),
  paymentCardNumber: z.string().max(20).nullable().optional(),
  paymentCardHolder: z.string().max(255).nullable().optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
