import { PgCategoryRepository } from '../../infrastructure/repositories/pg-category.repository.js';
import { cacheService } from '../../infrastructure/cache/redis.js';
import { ConflictError, NotFoundError } from '../../common/errors/index.js';
import type { CreateCategoryInput, CategoryDTO } from '@flex/shared';
import type { UpdateCategoryInput, ReorderCategoriesInput } from './category.validation.js';
import type { CategoryEntity } from '../../core/entities/category.entity.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toCategoryDto(entity: CategoryEntity): CategoryDTO {
  return {
    id: entity.id,
    storeId: entity.storeId,
    name: entity.name,
    slug: entity.slug,
    emoji: entity.emoji ?? null,
    imageUrl: entity.imageUrl ?? null,
    sortOrder: entity.sortOrder,
    isActive: entity.isActive,
    parentId: entity.parentId ?? null,
  };
}

export class CategoryService {
  private categoryRepo: PgCategoryRepository;

  constructor() {
    this.categoryRepo = new PgCategoryRepository();
  }

  private getCacheKey(storeId: number, activeOnly: boolean): string {
    return `store:${storeId}:categories:${activeOnly ? 'active' : 'all'}`;
  }

  private async invalidateCache(storeId: number): Promise<void> {
    await cacheService.delPattern(`store:${storeId}:categories:*`);
  }

  /**
   * Do'kondagi barcha kategoriyalarni olish (Redis Kesh bilan)
   */
  async getCategories(storeId: number, activeOnly = false): Promise<CategoryDTO[]> {
    const cacheKey = this.getCacheKey(storeId, activeOnly);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const categories = await this.categoryRepo.findMany(storeId, activeOnly);
        return categories.map(toCategoryDto);
      },
      600 // 10 daqiqa TTL
    );
  }

  /**
   * Yangi kategoriya yaratish
   */
  async createCategory(storeId: number, input: CreateCategoryInput): Promise<CategoryDTO> {
    const slug = slugify(input.name);

    // Bir xil do'konda slug takrorlanmasligi kerak
    const existing = await this.categoryRepo.findBySlug(storeId, slug);
    if (existing) {
      throw new ConflictError(`"${input.name}" nomli kategoriya allaqachon mavjud`);
    }

    const created = await this.categoryRepo.create(storeId, {
      ...input,
      slug,
      imageUrl: null,
    });

    await this.invalidateCache(storeId);
    return toCategoryDto(created);
  }

  /**
   * Kategoriyani tahrirlash
   */
  async updateCategory(
    storeId: number,
    categoryId: number,
    input: UpdateCategoryInput
  ): Promise<CategoryDTO> {
    const category = await this.categoryRepo.findById(storeId, categoryId);
    if (!category) {
      throw new NotFoundError('Kategoriya');
    }

    const updated = await this.categoryRepo.update(storeId, categoryId, input);
    if (!updated) {
      throw new NotFoundError('Kategoriya yangilanmadi');
    }

    await this.invalidateCache(storeId);
    return toCategoryDto(updated);
  }

  /**
   * Kategoriyani o'chirish
   */
  async deleteCategory(storeId: number, categoryId: number): Promise<void> {
    const category = await this.categoryRepo.findById(storeId, categoryId);
    if (!category) {
      throw new NotFoundError('Kategoriya');
    }

    await this.categoryRepo.delete(storeId, categoryId);
    await this.invalidateCache(storeId);
  }

  /**
   * Kategoriyalar ketma-ketligini (sortOrder) qayta tartiblash
   */
  async reorderCategories(storeId: number, input: ReorderCategoriesInput): Promise<void> {
    await this.categoryRepo.reorder(storeId, input.items);
    await this.invalidateCache(storeId);
  }
}
