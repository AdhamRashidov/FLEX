import { logger } from '../../common/logger/index.js';
import { formatMoney, formatDate } from '@flex/shared';
import type { OrderEntity } from '../../core/entities/order.entity.js';
import type { StoreEntity } from '../../core/entities/store.entity.js';

export class TelegramNotificationService {
  /**
   * Telegram Bot API orqali xabar yuborish
   */
  private async sendMessage(
    botToken: string,
    chatId: number | string,
    text: string,
    replyMarkup?: unknown
  ): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });

      const json = await res.json() as { ok: boolean; description?: string };
      if (!json.ok) {
        logger.warn('TelegramNotification', `Xabar yuborishda xatolik: ${json.description}`);
        return false;
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('TelegramNotification', `Tarmoq xatosi: ${msg}`);
      return false;
    }
  }

  /**
   * Do'kondorga yangi buyurtma haqida chek va boshqaruv tugmalarini yuborish
   */
  async notifyNewOrder(store: StoreEntity, order: OrderEntity, ownerTelegramId?: number): Promise<void> {
    const botToken = store.botToken;
    const targetChatId = ownerTelegramId;

    if (!botToken || !targetChatId) {
      logger.warn('TelegramNotification', `Do'kon (${store.name}) uchun bot token yoki egasining Telegram ID si sozlanmagan`);
      return;
    }

    // Mahsulotlar ro'yxatini formatlash
    const itemsText = (order.items || [])
      .map(
        (item, idx) =>
          `<b>${idx + 1}.</b> ${item.productName}\n   └ ${formatMoney(item.productPrice)} × ${item.quantity} = <b>${formatMoney(item.total)}</b>`
      )
      .join('\n');

    const paymentMethodText =
      order.paymentMethod === 'cash' ? '💵 Naqd pul' : '💳 Karta orqali';
    const deliveryTypeText =
      order.deliveryType === 'delivery' ? '🚲 Yetkazib berish' : '🏪 Do\'kondan olib ketish';

    const message = [
      `🔔 <b>YANGI BUYURTMA #${order.orderNumber}</b>`,
      `🏪 <b>Do'kon:</b> ${store.name}`,
      `📅 <b>Sana:</b> ${formatDate(order.createdAt.toISOString())}`,
      '',
      `👤 <b>Mijoz:</b> ${order.customerName || 'Noma\'lum'}`,
      `📞 <b>Telefon:</b> <code>${order.customerPhone || 'Kiritilmagan'}</code>`,
      `🚚 <b>Yetkazish:</b> ${deliveryTypeText}`,
      order.deliveryAddress ? `📍 <b>Manzil:</b> ${order.deliveryAddress}` : '',
      `💳 <b>To'lov:</b> ${paymentMethodText}`,
      order.customerNote ? `💬 <b>Izoh:</b> <i>${order.customerNote}</i>` : '',
      '',
      '🛒 <b>Buyurtma tarkibi:</b>',
      itemsText,
      '',
      order.deliveryFee > 0 ? `🛵 <b>Yetkazib berish narxi:</b> ${formatMoney(order.deliveryFee)}` : '',
      `💰 <b>JAMI TO'LOV: ${formatMoney(order.total)}</b>`,
    ]
      .filter(Boolean)
      .join('\n');

    // Inline boshqaruv tugmalari: [✅ Qabul qilish] [❌ Rad etish]
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Qabul qilish', callback_data: `order_confirm:${order.id}` },
          { text: '❌ Rad etish', callback_data: `order_cancel:${order.id}` },
        ],
      ],
    };

    await this.sendMessage(botToken, targetChatId, message, replyMarkup);
  }

  /**
   * Xaridorga buyurtma holati o'zgarganligi haqida xabar berish
   */
  async notifyCustomerStatusChange(
    botToken: string,
    customerTelegramId: number,
    order: OrderEntity,
    storeName: string
  ): Promise<void> {
    if (!botToken || !customerTelegramId) return;

    let statusText = '';
    switch (order.status) {
      case 'confirmed':
        statusText = '✅ Buyurtmangiz do\'kon tomonidan <b>qabul qilindi</b> va tayyorlanishga topshirildi.';
        break;
      case 'preparing':
        statusText = '📦 Buyurtmangiz <b>tayyorlanmoqda</b>.';
        break;
      case 'delivering':
        statusText = '🚚 Buyurtmangiz kuryer orqali <b>yetkazilmoqda</b>. Tez orada yetib boradi!';
        break;
      case 'delivered':
        statusText = '🎉 Buyurtmangiz <b>yetkazildi</b>! Xaridingiz uchun rahmat, yana kutib qolamiz!';
        break;
      case 'cancelled':
        statusText = `❌ Buyurtmangiz <b>bekor qilindi</b>.${order.cancelReason ? `\nSabab: <i>${order.cancelReason}</i>` : ''}`;
        break;
      default:
        return;
    }

    const message = [
      `📦 <b>Buyurtma holati yangilandi!</b>`,
      `🏪 <b>Do'kon:</b> ${storeName}`,
      `🔢 <b>Buyurtma raqami:</b> #${order.orderNumber}`,
      '',
      statusText,
      '',
      `💰 <b>Umumiy summa:</b> ${formatMoney(order.total)}`,
    ].join('\n');

    await this.sendMessage(botToken, customerTelegramId, message);
  }
}

export const telegramNotificationService = new TelegramNotificationService();
