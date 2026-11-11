import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import {
  requireAuth,
  requireRole,
  resolveTenant,
} from '../../common/middlewares/index.js';
import { UserRole } from '@flex/shared';

const router = Router();
const controller = new FinanceController();

// Do'kondor va menejerlar uchun himoyalangan moliyaviy marshrutlar
router.use(
  requireAuth,
  resolveTenant,
  requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
);

// 1. Umumiy moliya balansi va xulosasi
router.get('/summary', controller.getSummary);

// 2. Hisobotlar
router.get('/reports/sales', controller.getSalesReport);
router.get('/reports/top-products', controller.getTopProducts);
router.get('/reports/categories', controller.getCategorySales);

// 3. Tranzaksiyalar (Kirim / Chiqim qaydnomasi)
router.get('/transactions', controller.getTransactions);
router.post('/transactions', controller.createTransaction);
router.get('/transactions/:id', controller.getTransactionById);

export { router as financeRoutes };
