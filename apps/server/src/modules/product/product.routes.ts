import { Router } from 'express';
import { ProductController } from './product.controller.js';
import {
  requireAuth,
  requireRole,
  resolveTenant,
  validateBody,
  validateQuery,
} from '../../common/middlewares/index.js';
import {
  createProductSchema,
  updateProductSchema,
  productFilterSchema,
  updateStockSchema,
  addProductImageSchema,
} from './product.validation.js';
import { UserRole } from '@flex/shared';

const controller = new ProductController();

// ── Admin Marshrutlari (/api/v1/store/products) ──
const storeProductRouter = Router();

storeProductRouter.use(requireAuth, resolveTenant, requireRole(UserRole.OWNER, UserRole.MANAGER));

storeProductRouter.get('/', validateQuery(productFilterSchema), controller.getStoreProducts);
storeProductRouter.post('/', validateBody(createProductSchema), controller.createProduct);
storeProductRouter.get('/:id', controller.getStoreProductById);
storeProductRouter.patch('/:id', validateBody(updateProductSchema), controller.updateProduct);
storeProductRouter.delete('/:id', controller.deleteProduct);
storeProductRouter.patch('/:id/stock', validateBody(updateStockSchema), controller.updateStock);
storeProductRouter.post('/:id/images', validateBody(addProductImageSchema), controller.addProductImage);
storeProductRouter.delete('/:id/images/:imageId', controller.deleteProductImage);

export { storeProductRouter };

// ── Xaridor Marshrutlari (/api/v1/shop/:storeSlug/products) ──
const shopProductRouter = Router({ mergeParams: true });

shopProductRouter.use(resolveTenant);
shopProductRouter.get('/', validateQuery(productFilterSchema), controller.getShopProducts);
shopProductRouter.get('/:id', controller.getShopProductById);

export { shopProductRouter };
