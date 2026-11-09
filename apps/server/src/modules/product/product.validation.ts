import { z } from 'zod';
import { createProductSchema, paginationSchema } from '@flex/shared';

export { createProductSchema };

export const updateProductSchema = createProductSchema.partial();

export const productFilterSchema = paginationSchema.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStockOnly: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const updateStockSchema = z.object({
  quantityChange: z.number().int().refine((val) => val !== 0, 'O\'zgarish miqdori 0 bo\'lishi mumkin emas'),
});

export const addProductImageSchema = z.object({
  isPrimary: z.boolean().default(false),
  imageBase64: z.string().min(1, 'Rasm base64 ma\'lumoti kiritilishi shart'),
  filename: z.string().default('product.webp'),
  mimeType: z.string().default('image/webp'),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
