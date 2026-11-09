import type { ProductEntity, ProductImageEntity } from '../entities/product.entity.js';
import type { CreateProductInput } from '@flex/shared';

export interface ProductFilter {
  categoryId?: number;
  isActive?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface IProductRepository {
  findById(storeId: number, id: number): Promise<ProductEntity | null>;
  findByBarcode(storeId: number, barcode: string): Promise<ProductEntity | null>;
  findMany(storeId: number, filter?: ProductFilter): Promise<{ products: ProductEntity[]; total: number }>;
  create(storeId: number, data: CreateProductInput): Promise<ProductEntity>;
  update(storeId: number, id: number, data: Partial<CreateProductInput>): Promise<ProductEntity | null>;
  delete(storeId: number, id: number): Promise<boolean>;
  updateStock(storeId: number, id: number, quantityChange: number): Promise<number>;
  addImages(storeId: number, productId: number, images: { url: string; isPrimary: boolean }[]): Promise<ProductImageEntity[]>;
  deleteImage(storeId: number, imageId: number): Promise<boolean>;
}
