import { z } from 'zod';
import { PaymentMethod, DeliveryType, ProductUnit, OrderStatus, TransactionType } from '../enums/index.js';
import { uzPhoneSchema, usernameSchema, strongPasswordSchema } from '../validators/index.js';

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
  unit: z.enum([
    ProductUnit.DONA,
    ProductUnit.KG,
    ProductUnit.LITR,
    ProductUnit.METR,
    ProductUnit.PACHKA,
    ProductUnit.QUTI,
    ProductUnit.JUFT,
  ]).default(ProductUnit.DONA),
  categoryId: z.number().int().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  trackStock: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Buyurtma elementi sxemasi */
export const orderItemInputSchema = z.object({
  productId: z.number().int().positive('Mahsulot ID si to\'g\'ri bo\'lishi shart'),
  quantity: z.number().int().positive('Miqdor kamida 1 bo\'lishi shart'),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

/** Buyurtma yaratish sxemasi */
export const createOrderSchema = z.object({
  customerName: z.string().min(1, 'Ismingizni kiriting').max(200),
  customerPhone: z.string().min(9, 'Telefon raqamingizni to\'liq kiriting').max(30),
  paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.CARD_TRANSFER]),
  deliveryType: z.enum([DeliveryType.DELIVERY, DeliveryType.PICKUP]),
  deliveryAddress: z.string().max(1000).optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  customerNote: z.string().max(500).optional(),
  items: z.array(orderItemInputSchema).min(1, 'Savatda kamida 1 ta mahsulot bo\'lishi shart'),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Buyurtma holatini yangilash sxemasi */
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.DELIVERING,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ]),
  cancelReason: z.string().max(500).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

/** Buyurtmalar filtri sxemasi */
export const orderFilterSchema = paginationSchema.extend({
  status: z.enum([
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.DELIVERING,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ]).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type OrderFilterInput = z.infer<typeof orderFilterSchema>;

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

/** Tranzaksiya yaratish sxemasi */
export const createTransactionSchema = z.object({
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  category: z.string().min(1, 'Kategoriya kiritilishi shart').max(50),
  amount: z.number().int().positive('Summa 0 dan katta bo\'lishi shart'),
  description: z.string().max(1000).optional(),
  orderId: z.number().int().positive().optional(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/** Tranzaksiyalar filtri sxemasi */
export const transactionFilterSchema = paginationSchema.extend({
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

/** Sotuvlar hisoboti filtri sxemasi */
export const salesReportQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'custom']).default('daily'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type SalesReportQueryInput = z.infer<typeof salesReportQuerySchema>;

/** Top mahsulotlar hisoboti filtri sxemasi */
export const topProductsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'all']).default('month'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type TopProductsQueryInput = z.infer<typeof topProductsQuerySchema>;

/** POS sotuv elementi sxemasi */
export const posSaleItemSchema = z.object({
  barcode: z.string().optional(),
  productId: z.number().int().positive().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().positive('Sotilgan miqdor kamida 1 bo\'lishi kerak'),
  price: z.number().int().min(0).optional(),
});
export type PosSaleItemInput = z.infer<typeof posSaleItemSchema>;

/** POS sotuv webhook sxemasi */
export const posSaleWebhookSchema = z.object({
  receiptNumber: z.string().max(100).optional(),
  paymentMethod: z.enum(['cash', 'card', 'other']).default('cash'),
  items: z.array(posSaleItemSchema).min(1, 'Kamida 1 ta tovar ko\'rsatilishi shart'),
  timestamp: z.string().optional(),
});
export type PosSaleWebhookInput = z.infer<typeof posSaleWebhookSchema>;

/** POS stock sinxronizatsiya elementi */
export const posStockSyncItemSchema = z.object({
  barcode: z.string().optional(),
  sku: z.string().optional(),
  productId: z.number().int().positive().optional(),
  stockQuantity: z.number().int().min(0, 'Qoldiq 0 dan kam bo\'lishi mumkin emas'),
  price: z.number().int().min(0).optional(),
});
export type PosStockSyncItemInput = z.infer<typeof posStockSyncItemSchema>;

/** POS ommaviy stock sinxronizatsiyasi */
export const posStockSyncSchema = z.object({
  items: z.array(posStockSyncItemSchema).min(1, 'Kamida 1 ta tovar ko\'rsatilishi shart'),
});
export type PosStockSyncInput = z.infer<typeof posStockSyncSchema>;

/** Global Katalog tovarini yaratish sxemasi */
export const createGlobalCatalogItemSchema = z.object({
  name: z.string().min(1, 'Mahsulot nomi kiritilishi shart').max(500),
  barcode: z.string().max(50).optional(),
  category: z.string().max(255).optional(),
  brand: z.string().max(255).optional(),
  unit: z.string().max(20).default('dona'),
  imageUrl: z.string().url('Rasm havolasi to\'g\'ri URL bo\'lishi kerak').optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
});
export type CreateGlobalCatalogItemInput = z.infer<typeof createGlobalCatalogItemSchema>;

/** Global Katalog tovarini tahrirlash sxemasi */
export const updateGlobalCatalogItemSchema = createGlobalCatalogItemSchema.partial();
export type UpdateGlobalCatalogItemInput = z.infer<typeof updateGlobalCatalogItemSchema>;

/** Do'kon holatini o'zgartirish sxemasi (Super Admin) */
export const updateStoreStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'maintenance']),
  reason: z.string().max(500).optional(),
});
export type UpdateStoreStatusInput = z.infer<typeof updateStoreStatusSchema>;

/** Do'kon egasi ro'yxatdan o'tish (Register) sxemasi */
export const registerOwnerSchema = z.object({
  firstName: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo'lishi shart").max(100),
  lastName: z.string().max(100).optional(),
  phone: uzPhoneSchema,
  username: usernameSchema,
  password: strongPasswordSchema,
  storeName: z.string().min(2, "Do'kon nomi kamida 2 ta belgidan iborat bo'lishi shart").max(200),
  storeSlug: z
    .string()
    .min(2, "Do'kon havolasi kamida 2 ta belgidan iborat bo'lishi shart")
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Do'kon havolasi faqat kichik lotin harflari, raqamlar va chiziqcha bo'lishi mumkin")
    .optional(),
});
export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;


