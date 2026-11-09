/** Foydalanuvchi rollari */
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  CUSTOMER: 'customer',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Buyurtma holatlari */
export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** To'lov usullari */
export const PaymentMethod = {
  CASH: 'cash',
  CARD_TRANSFER: 'card_transfer',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/** To'lov holati */
export const PaymentStatus = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Yetkazib berish turi */
export const DeliveryType = {
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
} as const;
export type DeliveryType = (typeof DeliveryType)[keyof typeof DeliveryType];

/** Mahsulot o'lchov birligi */
export const ProductUnit = {
  DONA: 'dona',
  KG: 'kg',
  LITR: 'litr',
  METR: 'metr',
  PACHKA: 'pachka',
  QUTI: 'quti',
  JUFT: 'juft',
} as const;
export type ProductUnit = (typeof ProductUnit)[keyof typeof ProductUnit];

/** Do'kon holati */
export const StoreStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  MAINTENANCE: 'maintenance',
} as const;
export type StoreStatus = (typeof StoreStatus)[keyof typeof StoreStatus];

/** Tranzaksiya turi */
export const TransactionType = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

/** Import manba turi */
export const ImportSource = {
  EXCEL: 'excel',
  TELEGRAM: 'telegram',
  GLOBAL_CATALOG: 'global_catalog',
  POS: 'pos',
} as const;
export type ImportSource = (typeof ImportSource)[keyof typeof ImportSource];

/** Xodim roli */
export const StaffRole = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];
