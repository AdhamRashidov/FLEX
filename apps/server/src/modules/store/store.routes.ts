import { Router } from 'express';
import { StoreController } from './store.controller.js';
import { PosController } from '../integration/pos.controller.js';
import { requireAuth, resolveTenant, validateBody } from '../../common/middlewares/index.js';
import { createStoreSchema, updateStoreSchema } from './store.validation.js';

const router = Router();
const controller = new StoreController();
const posController = new PosController();

// Do'kon egasining profili va do'konlari
router.get('/profile', requireAuth, controller.getMyStores);
router.patch('/:storeId', requireAuth, validateBody(updateStoreSchema), controller.updateStore);

// POS integratsiya sozlamalari (API kalit va webhook)
router.get('/settings/pos', requireAuth, resolveTenant, posController.getSettings);
router.post('/settings/pos/regenerate-key', requireAuth, resolveTenant, posController.regenerateKey);
router.patch('/settings/pos/toggle', requireAuth, resolveTenant, posController.togglePos);

export { router as storeRoutes };

// Super Admin / Do'kon yaratish marshrutlari
const adminRouter = Router();
adminRouter.post('/', requireAuth, validateBody(createStoreSchema), controller.createStore);
adminRouter.get('/', requireAuth, controller.listAllStores);

export { adminRouter as adminStoreRoutes };

// Xaridorlar uchun do'kon ochiq ma'lumotlari marshruti
const shopRouter = Router();
shopRouter.get('/:storeSlug/info', controller.getPublicInfo);

export { shopRouter as shopStoreRoutes };
