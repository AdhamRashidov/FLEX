import type { ProductUnit } from '@flex/shared';

export interface ProductImageEntity {
  id: number;
  productId: number;
  storeId: number;
  url: string;
  tgFileId?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface ProductEntity {
  id: number;
  storeId: number;
  categoryId?: number | null;
  name: string;
  description?: string | null;
  barcode?: string | null;
  sku?: string | null;
  price: number;
  oldPrice?: number | null;
  costPrice?: number | null;
  unit: ProductUnit;
  stockQuantity: number;
  lowStockThreshold: number;
  trackStock: boolean;
  attributes?: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  images?: ProductImageEntity[];
  createdAt: Date;
  updatedAt: Date;
}
