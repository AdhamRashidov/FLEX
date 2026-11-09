import { z } from 'zod';
import { PaymentMethod, DeliveryType, ProductUnit } from '../enums/index.js';

/** Paginatsiya so'rov parametrlari */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/** Mahsulot yaratish sxemasi */
export const createProductSchema = z.object({
  name: z.string().min(1, 'Mahsulot nomi kiritilishi shart').max(500),
  description: z.string().max(2000).optional(),
  barcode: z.string().max(50).optional(),
  sku: z.string().max(100).optional(),
  price: z.number().int().min(0, 'Narx 0 dan kam bo\'lishi mumkin emas'),
  oldPrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  unit: z.enum([ProductUnit.DONA, ProductUnit.KG, ProductUnit.LITR, ProductUnit.METR, ProductUnit.PACHKA, ProductUnit.QUTI, ProductUnit.JUFT]).default(ProductUnit.DONA),
  categoryId: z.number().int().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  trackStock: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Buyurtma yaratish sxemasi */
export const createOrderSchema = z.object({
  paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.CARD_TRANSFER]),
  deliveryType: z.enum([DeliveryType.DELIVERY, DeliveryType.PICKUP]),
  deliveryAddress: z.string().optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  customerNote: z.string().max(500).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Kategoriya yaratish sxemasi */
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Kategoriya nomi kiritilishi shart').max(255),
  emoji: z.string().max(10).optional(),
  parentId: z.number().int().optional(),
  sortOrder: z.number().int().default(0),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** Savat elementi qo'shish sxemasi */
export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).default(1),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;
