import { Router } from 'express';
import { SuperController } from './super.controller.js';
import { requireAuth, requireRole } from '../../common/middlewares/index.js';
import { UserRole } from '@flex/shared';

const router = Router();
const controller = new SuperController();

// 🔒 FAQAT SUPER ADMIN UCHUN HIMOYALANGAN MARSHRUTLAR
router.use(requireAuth, requireRole(UserRole.SUPER_ADMIN));

// 1. Dashboard va Platforma Monitoringi
router.get('/dashboard', controller.getDashboard);

// 2. Do'konlar boshqaruvi
router.get('/stores', controller.listStores);
router.get('/stores/:id', controller.getStoreDetails);
router.patch('/stores/:id/status', controller.updateStoreStatus);

// 3. Global Katalog boshqaruvi (Umumiy tovarlar, studiya rasmlari)
router.get('/catalog', controller.listCatalog);
router.post('/catalog', controller.createCatalogItem);
router.patch('/catalog/:id', controller.updateCatalogItem);
router.delete('/catalog/:id', controller.deleteCatalogItem);

// 4. Foydalanuvchilar boshqaruvi
router.get('/users', controller.listUsers);
router.patch('/users/:id/role', controller.setUserSuperAdmin);

export { router as superRoutes };
