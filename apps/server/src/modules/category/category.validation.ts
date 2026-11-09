import { z } from 'zod';
import { createCategorySchema } from '@flex/shared';

export { createCategorySchema };

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1, 'Kamida bitta kategoriya ko\'rsatilishi kerak'),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
