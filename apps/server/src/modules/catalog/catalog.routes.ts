import { Router } from 'express';
import { CatalogController } from './catalog.controller.js';
import {
  requireAuth,
  requireRole,
  resolveTenant,
} from '../../common/middlewares/index.js';
import { UserRole } from '@flex/shared';

const router = Router();
const controller = new CatalogController();

// Do'kondorlar uchun himoyalangan marshrutlar
router.use(
  requireAuth,
  resolveTenant,
  requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
);

// Shtrix-kod bo'yicha qidirish
router.get('/barcode/:barcode', controller.lookupBarcode);

// Qidiruv
router.get('/search', controller.searchCatalog);

// Do'konga qabul qilish
router.post('/adopt/:id', controller.adoptProduct);

export { router as catalogRoutes };
