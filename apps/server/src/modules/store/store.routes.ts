import { Router } from 'express';
import { StoreController } from './store.controller.js';
import { requireAuth, validateBody } from '../../common/middlewares/index.js';
import { createStoreSchema, updateStoreSchema } from './store.validation.js';

const router = Router();
const controller = new StoreController();

// Do'kon egasining profili va do'konlari
router.get('/profile', requireAuth, controller.getMyStores);
router.patch('/:storeId', requireAuth, validateBody(updateStoreSchema), controller.updateStore);

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
