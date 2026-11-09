import type { Request, Response } from 'express';
import { CategoryService } from './category.service.js';
import type { CreateCategoryInput } from '@flex/shared';
import type { UpdateCategoryInput, ReorderCategoriesInput } from './category.validation.js';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * GET /api/v1/store/categories
   * Do'kondagi barcha kategoriyalar ro'yxati (Admin)
   */
  getStoreCategories = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const categories = await this.categoryService.getCategories(storeId, false);

    res.json({
      success: true,
      data: categories,
    });
  };

  /**
   * POST /api/v1/store/categories
   * Yangi kategoriya yaratish (Admin)
   */
  createCategory = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const input = req.body as CreateCategoryInput;
    const category = await this.categoryService.createCategory(storeId, input);

    res.status(201).json({
      success: true,
      data: category,
    });
  };

  /**
   * PATCH /api/v1/store/categories/:id
   * Kategoriyani tahrirlash (Admin)
   */
  updateCategory = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
    const categoryId = parseInt(idStr ?? '0', 10);
    const input = req.body as UpdateCategoryInput;

    const updated = await this.categoryService.updateCategory(storeId, categoryId, input);

    res.json({
      success: true,
      data: updated,
    });
  };

  /**
   * DELETE /api/v1/store/categories/:id
   * Kategoriyani o'chirish (Admin)
   */
  deleteCategory = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
    const categoryId = parseInt(idStr ?? '0', 10);

    await this.categoryService.deleteCategory(storeId, categoryId);

    res.json({
      success: true,
      data: { message: 'Kategoriya muvaffaqiyatli o\'chirildi' },
    });
  };

  /**
   * PATCH /api/v1/store/categories/reorder
   * Kategoriyalar ketma-ketligini o'zgartirish (Admin)
   */
  reorderCategories = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const input = req.body as ReorderCategoriesInput;

    await this.categoryService.reorderCategories(storeId, input);

    res.json({
      success: true,
      data: { message: 'Kategoriyalar tartibi saqlandi' },
    });
  };

  /**
   * GET /api/v1/shop/:storeSlug/categories
   * Xaridor uchun faol kategoriyalar ro'yxati (Public)
   */
  getShopCategories = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const categories = await this.categoryService.getCategories(storeId, true);

    res.json({
      success: true,
      data: categories,
    });
  };
}
