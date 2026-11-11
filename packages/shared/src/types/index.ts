import type { OrderStatus, PaymentMethod, PaymentStatus, DeliveryType, ProductUnit, StoreStatus, StaffRole, TransactionType } from '../enums/index.js';

/** API muvaffaqiyatli javob formati */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: Pagination;
  };
}

/** API xatolik javob formati */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
  timestamp: string;
}

/** Paginatsiya meta ma'lumoti */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Do'kon (Tenant) */
export interface StoreDTO {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  status: StoreStatus;
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryPrice: number;
  minOrderAmount: number;
  paymentCardNumber: string | null;
  createdAt: string;
}

/** Mahsulot */
export interface ProductDTO {
  id: number;
  storeId: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  barcode: string | null;
  price: number;
  oldPrice: number | null;
  unit: ProductUnit;
  stockQuantity: number;
  trackStock: boolean;
  isActive: boolean;
  images: ProductImageDTO[];
  createdAt: string;
}

/** Mahsulot rasmi */
export interface ProductImageDTO {
  id: number;
  url: string;
  isPrimary: boolean;
}

/** Kategoriya */
export interface CategoryDTO {
  id: number;
  storeId: number;
  name: string;
  slug: string;
  emoji: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
}

/** Buyurtma */
export interface OrderDTO {
  id: number;
  storeId: number;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryType: DeliveryType;
  deliveryAddress: string | null;
  customerNote: string | null;
  items: OrderItemDTO[];
  createdAt: string;
}

/** Buyurtma elementi */
export interface OrderItemDTO {
  id: number;
  productName: string;
  productPrice: number;
  quantity: number;
  total: number;
}

/** Savat elementi */
export interface CartItemDTO {
  id: number;
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string | null;
  quantity: number;
  stockQuantity: number;
}

/** Foydalanuvchi (Telegram) */
export interface UserDTO {
  id: number;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
}

/** Xodim */
export interface StaffMemberDTO {
  id: number;
  userId: number;
  role: StaffRole;
  firstName: string;
  lastName: string | null;
  username: string | null;
  isActive: boolean;
}

/** Moliyaviy tranzaksiya */
export interface TransactionDTO {
  id: number;
  storeId: number;
  orderId: number | null;
  type: TransactionType;
  category: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

/** Moliya umumiy xulosasi (Summary) */
export interface FinanceSummaryDTO {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  todayIncome: number;
  todayExpense: number;
  todayOrdersCount: number;
  weekIncome: number;
  weekExpense: number;
  monthIncome: number;
  monthExpense: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
}

/** Vaqt bo'yicha sotuv nuqtasi (Chart nuqtasi) */
export interface SalesChartPointDTO {
  date: string;
  ordersCount: number;
  totalSales: number;
  netIncome: number;
  expenses: number;
}

/** Top sotilgan mahsulot */
export interface TopProductDTO {
  productId: number;
  productName: string;
  imageUrl: string | null;
  totalQuantity: number;
  totalRevenue: number;
  percentage: number;
}

/** Kategoriya bo'yicha sotuv ulushi */
export interface CategorySalesDTO {
  categoryId: number | null;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  percentage: number;
}

/** POS sotuv natijasi */
export interface PosSaleResultDTO {
  success: boolean;
  storeId: number;
  totalItems: number;
  updatedProducts: Array<{
    id: number;
    name: string;
    soldQuantity: number;
    remainingStock: number;
  }>;
  notFoundItems: Array<{
    barcode?: string;
    sku?: string;
    productId?: number;
  }>;
  transactionId?: number;
}

/** POS stock sinxronizatsiya natijasi */
export interface PosStockSyncResultDTO {
  success: boolean;
  storeId: number;
  totalReceived: number;
  updatedCount: number;
  notFoundBarcodes: string[];
}

/** POS integratsiya sozlamalari */
export interface PosIntegrationSettingsDTO {
  storeId: number;
  posApiKey: string | null;
  posEnabled: boolean;
  lastSyncAt: string | null;
  webhookUrl: string;
}

/** Super Admin Dashboard statistikasi */
export interface SuperDashboardDTO {
  stores: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  };
  metrics: {
    totalGmv: number;
    totalOrders: number;
    totalUsers: number;
    todayOrders: number;
    todayGmv: number;
  };
  system: {
    status: 'healthy' | 'degraded' | 'down';
    uptimeSeconds: number;
    nodeVersion: string;
    memoryMb: number;
    postgresPoolTotal: number;
    postgresPoolIdle: number;
    redisConnected: boolean;
  };
}

/** Super Admin do'konlar ro'yxati elementi */
export interface SuperStoreListItemDTO {
  id: number;
  name: string;
  slug: string;
  status: StoreStatus;
  ownerId: number;
  ownerName: string;
  ownerPhone: string | null;
  botUsername: string | null;
  totalOrders: number;
  totalGmv: number;
  productsCount: number;
  posEnabled: boolean;
  createdAt: string;
}

/** Global Katalog elementi DTO */
export interface GlobalCatalogItemDTO {
  id: number;
  name: string;
  barcode: string | null;
  category: string | null;
  brand: string | null;
  unit: string;
  imageUrl: string | null;
  description: string | null;
  createdAt: string;
}

/** Super Admin foydalanuvchilar ro'yxati elementi */
export interface SuperUserListItemDTO {
  id: number;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  isSuperAdmin: boolean;
  ownedStoresCount: number;
  createdAt: string;
}


