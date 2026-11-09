import type { CategoryEntity } from '../entities/category.entity.js';
import type { CreateCategoryInput } from '@flex/shared';

export interface ICategoryRepository {
  findById(storeId: number, id: number): Promise<CategoryEntity | null>;
  findBySlug(storeId: number, slug: string): Promise<CategoryEntity | null>;
  findMany(storeId: number, activeOnly?: boolean): Promise<CategoryEntity[]>;
  create(storeId: number, data: CreateCategoryInput & { slug: string; imageUrl?: string | null }): Promise<CategoryEntity>;
  update(storeId: number, id: number, data: Partial<CreateCategoryInput & { isActive: boolean }>): Promise<CategoryEntity | null>;
  delete(storeId: number, id: number): Promise<boolean>;
  reorder(storeId: number, items: { id: number; sortOrder: number }[]): Promise<void>;
}
