import type { Request, Response } from 'express';
import { PgStoreRepository } from '../../infrastructure/repositories/pg-store.repository.js';
import { OrderService } from '../order/order.service.js';
import { logger } from '../../common/logger/index.js';
import { OrderStatus } from '@flex/shared';

export class TelegramWebhookController {
  private storeRepo: PgStoreRepository;
  private orderService: OrderService;

  constructor() {
    this.storeRepo = new PgStoreRepository();
    this.orderService = new OrderService();
  }

  /**
   * Telegram Bot Update larini qayta ishlash (/start komandasi va inline tugmalar)
   * Dinamik Multi-Bot: botToken yoki storeSlug bo'yicha do'konni aniqlaydi
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    // Telegramga har doim darhol 200 OK qaytarish shart
    res.status(200).json({ ok: true });

    const rawId = req.params.identifier || req.params.botToken || req.params.storeSlug;
    const identifier = Array.isArray(rawId) ? rawId[0] : rawId;
    const update = req.body;

    if (!update || !identifier) return;

    try {
      // 1. Do'konni token yoki slug orqali aniqlash
      let store = identifier.includes(':')
        ? await this.storeRepo.findByBotToken(identifier)
        : await this.storeRepo.findBySlug(identifier);

      if (!store) {
        store = await this.storeRepo.findByBotToken(identifier);
      }

      if (!store || !store.botToken) {
        logger.warn('TelegramWebhook', `Do'kon topilmadi: ${identifier}`);
        return;
      }

      const botToken = store.botToken;
      const webAppUrl = `${process.env.WEBHOOK_DOMAIN || 'http://localhost:5173'}?store=${store.slug}`;

      // 2. /start xabari kelganda: Do'kon vitrinasiga havola berish
      if (update.message?.text?.startsWith('/start')) {
        const chatId = update.message.chat.id;
        const firstName = update.message.from?.first_name || 'Hurmatli mijoz';

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Assalomu alaykum, <b>${firstName}</b>!\n\n<b>${store.name}</b> do'konimizga xush kelibsiz!\nBizning mahsulotlarimizni ko'rish, qidirish va qulay buyurtma berish uchun quyidagi tugmani bosing:`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🛍 Do\'konni ochish (Mini App)',
                    web_app: { url: webAppUrl },
                  },
                ],
              ],
            },
          }),
        });
        return;
      }

      // 3. Inline tugma bosilganda (Callback Query: Qabul qilish / Rad etish)
      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const data = String(callbackQuery.data || '');
        const callbackId = callbackQuery.id;
        const messageId = callbackQuery.message?.message_id;
        const chatId = callbackQuery.message?.chat?.id;

        if (data.startsWith('order_confirm:') || data.startsWith('order_cancel:')) {
          const [action, idStr] = data.split(':');
          const orderId = Number(idStr);

          if (!orderId || isNaN(orderId)) return;

          const newStatus =
            action === 'order_confirm' ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

          // Buyurtma statusini yangilash
          const updatedOrder = await this.orderService.updateOrderStatus(store.id, orderId, {
            status: newStatus,
            cancelReason: action === 'order_cancel' ? 'Do\'kon tomonidan rad etildi' : undefined,
          });

          // Telegramga javob qaytarish (Popup xabar)
          const alertText =
            newStatus === OrderStatus.CONFIRMED
              ? `✅ Buyurtma #${updatedOrder.orderNumber} muvaffaqiyatli qabul qilindi!`
              : `❌ Buyurtma #${updatedOrder.orderNumber} bekor qilindi!`;

          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackId,
              text: alertText,
              show_alert: true,
            }),
          });

          // Xabarni tahrirlash (tugmalarni yangilash va status belgisini qo'yish)
          if (chatId && messageId) {
            const operatorName = callbackQuery.from?.first_name || 'Xodim';
            const statusLabel =
              newStatus === OrderStatus.CONFIRMED
                ? `\n\n<b>✅ QABUL QILINDI</b> (${operatorName} tomonidan)`
                : `\n\n<b>❌ BEKOR QILINDI</b> (${operatorName} tomonidan)`;

            const originalText = callbackQuery.message?.text || '';

            await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: `${originalText}${statusLabel}`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] },
              }),
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('TelegramWebhook', `Webhook xatoligi: ${msg}`);
    }
  };

  /**
   * Telegram Bot uchun Webhook va ChatMenuButton ni avtomatik ro'yxatdan o'tkazish
   */
  registerWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const rawStoreId = ((req as unknown) as Record<string, unknown>).storeId;
      const storeId = Number(rawStoreId);


      const store = await this.storeRepo.findById(storeId);
      if (!store || !store.botToken) {
        res.status(400).json({ success: false, error: { message: 'Do\'kon yoki bot token topilmadi' } });
        return;
      }

      const domain = process.env.WEBHOOK_DOMAIN || 'https://api.flexmarket.uz';
      const webhookUrl = `${domain}/api/v1/webhook/${store.slug}`;
      const webAppUrl = `${domain}/?store=${store.slug}`;

      // 1. setWebhook API
      const hookRes = await fetch(`https://api.telegram.org/bot${store.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true,
        }),
      });
      const hookJson = await hookRes.json() as { ok: boolean; description?: string };

      // 2. setChatMenuButton (Pastki chap burchakdagi doimiy Mini App tugmasi)
      await fetch(`https://api.telegram.org/bot${store.botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '🛍 Do\'kon',
            web_app: { url: webAppUrl },
          },
        }),
      });

      res.json({
        success: true,
        data: {
          webhookUrl,
          webAppUrl,
          telegramResult: hookJson,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: { message: `Webhook ro'yxatdan o'tkazishda xatolik: ${msg}` } });
    }
  };
}
