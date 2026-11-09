import { Router } from 'express';
import { CategoryController } from './category.controller.js';
import {
  requireAuth,
  requireRole,
  resolveTenant,
  validateBody,
} from '../../common/middlewares/index.js';
import { createCategorySchema } from '@flex/shared';
import { updateCategorySchema, reorderCategoriesSchema } from './category.validation.js';
import { UserRole } from '@flex/shared';

const controller = new CategoryController();

// ── Admin Marshrutlari (/api/v1/store/categories) ──
const storeCategoryRouter = Router();

storeCategoryRouter.use(requireAuth, resolveTenant, requireRole(UserRole.OWNER, UserRole.MANAGER));

storeCategoryRouter.get('/', controller.getStoreCategories);
storeCategoryRouter.post('/', validateBody(createCategorySchema), controller.createCategory);
storeCategoryRouter.patch('/reorder', validateBody(reorderCategoriesSchema), controller.reorderCategories);
storeCategoryRouter.patch('/:id', validateBody(updateCategorySchema), controller.updateCategory);
storeCategoryRouter.delete('/:id', controller.deleteCategory);

export { storeCategoryRouter };

// ── Xaridor Marshrutlari (/api/v1/shop/:storeSlug/categories) ──
const shopCategoryRouter = Router({ mergeParams: true });

shopCategoryRouter.use(resolveTenant);
shopCategoryRouter.get('/', controller.getShopCategories);

export { shopCategoryRouter };
