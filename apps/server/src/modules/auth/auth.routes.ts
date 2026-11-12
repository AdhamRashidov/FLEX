import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody, requireAuth } from '../../common/middlewares/index.js';
import { telegramAuthSchema, credentialsAuthSchema } from './auth.validation.js';

const router = Router();
const controller = new AuthController();

// Ommaviy: Telegram initData bilan avtorizatsiya (Mini App)
router.post('/telegram', validateBody(telegramAuthSchema), controller.telegramLogin);

// Ommaviy: Telefon/Login va Parol bilan avtorizatsiya (Admin Panel)
router.post('/login', validateBody(credentialsAuthSchema), controller.credentialsLogin);

// Himoyalangan: Joriy profil
router.get('/me', requireAuth, controller.getMe);


export { router as authRoutes };
