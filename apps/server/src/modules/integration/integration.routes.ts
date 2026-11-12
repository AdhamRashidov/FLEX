import { Router } from 'express';
import { TelegramWebhookController } from './telegram-webhook.js';
import { PosController } from './pos.controller.js';
import { requirePosAuth, requireAuth, resolveTenant } from '../../common/middlewares/index.js';

const router = Router();
const tgController = new TelegramWebhookController();
const posController = new PosController();

// 1. Telegram bot webhook qabul qilish nuqtasi (slug yoki bot token)
router.post('/telegram/webhook/:identifier', tgController.handleWebhook);
router.post('/telegram/register', resolveTenant, requireAuth, tgController.registerWebhook);

// 2. POS (Kassa / 1C) integratsiya webhooklari (X-POS-Api-Key bilan himoyalangan)
router.post('/pos/sale', requirePosAuth, posController.handleSale);
router.post('/pos/stock-sync', requirePosAuth, posController.handleStockSync);


export { router as integrationRoutes };

