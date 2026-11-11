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
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    // Telegramga har doim darhol 200 OK qaytarish shart
    res.status(200).json({ ok: true });

    const rawSlug = req.params.storeSlug;
    const storeSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    const update = req.body;

    if (!update || !storeSlug) return;

    try {
      const store = await this.storeRepo.findBySlug(storeSlug);
      if (!store || !store.botToken) return;

      const botToken = store.botToken;

      // 1. /start xabari kelganda: Do'kon vitrinasiga havola berish
      if (update.message?.text?.startsWith('/start')) {
        const chatId = update.message.chat.id;
        const firstName = update.message.from.first_name || 'Do\'st';

        const webAppUrl = `${process.env.WEBHOOK_DOMAIN || 'http://localhost:5173'}?store=${store.slug}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Assalomu alaykum, <b>${firstName}</b>!\n\n<b>${store.name}</b> do'konimizga xush kelibsiz!\nBizning tovarlarimizni ko'rish va buyurtma berish uchun quyidagi tugmani bosing:`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🛍 Do\'konni ochish',
                    web_app: { url: webAppUrl },
                  },
                ],
              ],
            },
          }),
        });
        return;
      }

      // 2. Inline tugma bosilganda (Callback Query: Qabul qilish / Rad etish)
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
            const operatorName = callbackQuery.from.first_name || 'Xodim';
            const statusLabel =
              newStatus === OrderStatus.CONFIRMED
                ? `\n\n<b>✅ QABUL QILINDI</b> (${operatorName} tomonidan)`
                : `\n\n<b>❌ BEKOR QILINDI</b> (${operatorName} tomonidan)`;

            const originalText = callbackQuery.message.text || '';

            await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: `${originalText}${statusLabel}`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] }, // Tugmalarni olib tashlaymiz
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
}
