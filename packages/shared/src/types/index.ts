import type { OrderStatus, PaymentMethod, PaymentStatus, DeliveryType, ProductUnit, StoreStatus, StaffRole } from '../enums/index.js';

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
