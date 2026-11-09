import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody, requireAuth } from '../../common/middlewares/index.js';
import { telegramAuthSchema } from './auth.validation.js';

const router = Router();
const controller = new AuthController();

// Ommaviy: Telegram initData bilan avtorizatsiya
router.post('/telegram', validateBody(telegramAuthSchema), controller.telegramLogin);

// Himoyalangan: Joriy profil
router.get('/me', requireAuth, controller.getMe);

export { router as authRoutes };
