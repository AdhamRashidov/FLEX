import { Router } from 'express';
import { TelegramWebhookController } from './telegram-webhook.js';

const router = Router();
const controller = new TelegramWebhookController();

// Do'kon boti uchun webhook qabul qilish nuqtasi
router.post('/telegram/webhook/:storeSlug', controller.handleWebhook);

export { router as integrationRoutes };
