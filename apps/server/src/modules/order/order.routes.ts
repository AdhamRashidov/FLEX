import { Router } from 'express';
import { OrderController } from './order.controller.js';
import {
  requireAuth,
  optionalAuth,
  requireRole,
  resolveTenant,
  validateBody,
  validateQuery,
} from '../../common/middlewares/index.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderFilterSchema,
  paginationSchema,
  UserRole,
} from '@flex/shared';

const controller = new OrderController();

// ── Admin Marshrutlari (/api/v1/store/orders) ──
const storeOrderRouter = Router();

storeOrderRouter.use(
  requireAuth,
  resolveTenant,
  requireRole(UserRole.OWNER, UserRole.MANAGER)
);

storeOrderRouter.get('/', validateQuery(orderFilterSchema), controller.getStoreOrders);
storeOrderRouter.get('/:id', controller.getStoreOrderById);
storeOrderRouter.patch('/:id/status', validateBody(updateOrderStatusSchema), controller.updateOrderStatus);

export { storeOrderRouter };

// ── Xaridor Marshrutlari (/api/v1/shop/:storeSlug/orders) ──
const shopOrderRouter = Router({ mergeParams: true });

shopOrderRouter.use(resolveTenant);

// Buyurtma berish (Auth ixtiyoriy, Telegram initData bo'lsa profil ulanadi)
shopOrderRouter.post('/', optionalAuth, validateBody(createOrderSchema), controller.createOrder);

// Xaridorning o'z buyurtmalari (Auth talab qilinadi)
shopOrderRouter.get('/my', requireAuth, validateQuery(paginationSchema), controller.getShopMyOrders);

// Bitta buyurtma tafsilotlari (Chek ko'rish uchun)
shopOrderRouter.get('/:id', controller.getShopOrderById);

export { shopOrderRouter };
