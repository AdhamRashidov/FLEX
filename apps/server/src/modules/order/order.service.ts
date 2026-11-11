import { query, queryOne } from '../../infrastructure/database/pool.js';
import { PgOrderRepository } from '../../infrastructure/repositories/pg-order.repository.js';
import { PgStoreRepository } from '../../infrastructure/repositories/pg-store.repository.js';
import { PgFinanceRepository } from '../../infrastructure/repositories/pg-finance.repository.js';
import { cacheService } from '../../infrastructure/cache/redis.js';
import { telegramNotificationService } from '../../infrastructure/telegram/telegram-notification.service.js';
import { logger } from '../../common/logger/index.js';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../../common/errors/index.js';
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderFilterInput,
  PaginationInput,
  OrderDTO,
  OrderItemDTO,
} from '@flex/shared';
import type { OrderEntity } from '../../core/entities/order.entity.js';

function mapEntityToDTO(order: OrderEntity): OrderDTO {
  return {
    id: order.id,
    storeId: order.storeId,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    deliveryType: order.deliveryType,
    deliveryAddress: order.deliveryAddress ?? null,
    customerNote: order.customerNote ?? null,
    items: (order.items || []).map((i): OrderItemDTO => ({
      id: i.id,
      productName: i.productName,
      productPrice: i.productPrice,
      quantity: i.quantity,
      total: i.total,
    })),
    createdAt: order.createdAt.toISOString(),
  };
}

export class OrderService {
  private orderRepo: PgOrderRepository;
  private storeRepo: PgStoreRepository;
  private financeRepo: PgFinanceRepository;

  constructor() {
    this.orderRepo = new PgOrderRepository();
    this.storeRepo = new PgStoreRepository();
    this.financeRepo = new PgFinanceRepository();
  }

  /**
   * Xaridor tomonidan yangi buyurtma berish
   */
  async createOrder(
    storeId: number,
    input: CreateOrderInput,
    userId?: number
  ): Promise<OrderDTO> {
    // 1. Do'konni tekshirish
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError('Do\'kon');
    }
    if (store.status !== 'active') {
      throw new ValidationError('Do\'kon hozirda faol emas');
    }

    // 2. Mijozni aniqlash yoki yaratish (customers jadvali)
    let customerId: number;

    if (userId) {
      const existingCustomer = await queryOne<{ id: string }>(
        'SELECT id FROM customers WHERE store_id = $1 AND user_id = $2',
        [storeId, userId]
      );

      if (existingCustomer) {
        customerId = Number(existingCustomer.id);
        // Telefon raqamini yangilash
        await query(
          'UPDATE customers SET phone = $1, updated_at = NOW() WHERE id = $2',
          [input.customerPhone, customerId]
        );
      } else {
        const newCust = await queryOne<{ id: string }>(
          `INSERT INTO customers (store_id, user_id, phone)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [storeId, userId, input.customerPhone]
        );
        customerId = Number(newCust!.id);
      }
    } else {
      // Mehmon mijoz (telefon raqami orqali)
      const existingCust = await queryOne<{ id: string }>(
        'SELECT id FROM customers WHERE store_id = $1 AND phone = $2',
        [storeId, input.customerPhone]
      );

      if (existingCust) {
        customerId = Number(existingCust.id);
      } else {
        // Vaqtincha mehmon foydalanuvchi yaratish yoki biriktirish
        let guestUser = await queryOne<{ id: string }>(
          'SELECT id FROM users WHERE telegram_id = $1',
          [0]
        );

        if (!guestUser) {
          const uRes = await query<{ id: string }>(
            `INSERT INTO users (telegram_id, first_name)
             VALUES (0, 'Mehmon')
             RETURNING id`
          );
          guestUser = uRes.rows[0] ?? null;
        }

        const guestUserId = Number(guestUser!.id);
        const existingGuestCust = await queryOne<{ id: string }>(
          'SELECT id FROM customers WHERE store_id = $1 AND user_id = $2',
          [storeId, guestUserId]
        );

        if (existingGuestCust) {
          customerId = Number(existingGuestCust.id);
          await query('UPDATE customers SET phone = $1, updated_at = NOW() WHERE id = $2', [input.customerPhone, customerId]);
        } else {
          const newCust = await queryOne<{ id: string }>(
            `INSERT INTO customers (store_id, user_id, phone)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [storeId, guestUserId, input.customerPhone]
          );
          customerId = Number(newCust!.id);
        }
      }
    }

    // 3. Mahsulotlarni tekshirish va server narxlari bilan hisoblash
    const productIds = input.items.map((i) => i.productId);
    const { rows: dbProducts } = await query<{
      id: string;
      name: string;
      price: number;
      stock_quantity: number;
      track_stock: boolean;
      is_active: boolean;
    }>(
      `SELECT id, name, price, stock_quantity, track_stock, is_active
       FROM products
       WHERE store_id = $1 AND id = ANY($2::bigint[])`,
      [storeId, productIds]
    );

    const productMap = new Map(dbProducts.map((p) => [Number(p.id), p]));

    let calculatedSubtotal = 0;
    const orderItemsToCreate: Array<{
      productId: number;
      productName: string;
      productPrice: number;
      quantity: number;
      total: number;
    }> = [];

    for (const item of input.items) {
      const prod = productMap.get(Number(item.productId));
      if (!prod || !prod.is_active) {
        throw new NotFoundError(`Mahsulot (ID: ${item.productId})`);
      }

      // Ombordagi qoldiq tekshiruvi
      if (prod.track_stock && prod.stock_quantity < item.quantity) {
        throw new ConflictError(
          `"${prod.name}" mahsuloti omborda yetarli emas. Qoldiq: ${prod.stock_quantity} ta`
        );
      }

      const itemTotal = prod.price * item.quantity;
      calculatedSubtotal += itemTotal;

      orderItemsToCreate.push({
        productId: Number(prod.id),
        productName: prod.name,
        productPrice: prod.price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    // 4. Minimal buyurtma summasini tekshirish
    if (store.minOrderAmount > 0 && calculatedSubtotal < store.minOrderAmount) {
      throw new ValidationError(
        `Ushbu do'konda minimal buyurtma summasi ${store.minOrderAmount} so'm. Joriy summa: ${calculatedSubtotal} so'm`
      );
    }

    // 5. Yetkazib berish narxini hisoblash
    let deliveryFee = 0;
    if (input.deliveryType === 'delivery') {
      if (!store.deliveryEnabled) {
        throw new ValidationError('Do\'konda yetkazib berish xizmati o\'chirilgan');
      }
      if (!input.deliveryAddress) {
        throw new ValidationError('Yetkazib berish manzili kiritilishi shart');
      }
      deliveryFee = store.deliveryPrice ?? 0;
    }

    const calculatedTotal = calculatedSubtotal + deliveryFee;

    // 6. Tranzaksiyada buyurtmani yaratish va tovar qoldiqlarini kamaytirish
    const createdOrder = await this.orderRepo.createWithItems({
      storeId,
      customerId,
      paymentMethod: input.paymentMethod,
      deliveryType: input.deliveryType,
      deliveryAddress: input.deliveryAddress ?? null,
      deliveryLat: input.deliveryLat ?? null,
      deliveryLng: input.deliveryLng ?? null,
      customerNote: input.customerNote ?? null,
      subtotal: calculatedSubtotal,
      deliveryFee,
      discount: 0,
      total: calculatedTotal,
      items: orderItemsToCreate,
    });

    // 7. Ombordagi qoldiqlarni kamaytirish
    for (const item of input.items) {
      const prod = productMap.get(item.productId);
      if (prod?.track_stock) {
        await query(
          `UPDATE products
           SET stock_quantity = stock_quantity - $1,
               updated_at = NOW()
           WHERE id = $2 AND store_id = $3`,
          [item.quantity, item.productId, storeId]
        );
      }
    }

    // 8. Mahsulotlar keshini tozalash (ombor qoldig'i o'zgargani uchun)
    await cacheService.delPattern(`shop:products:${storeId}:*`);

    // 9. Telegram orqali do'kon egasiga xabarnoma yuborish
    try {
      const owner = await queryOne<{ telegram_id: number }>(
        'SELECT telegram_id FROM users WHERE id = $1',
        [store.ownerId]
      );
      createdOrder.customerName = input.customerName;
      createdOrder.customerPhone = input.customerPhone;

      await telegramNotificationService.notifyNewOrder(
        store,
        createdOrder,
        owner?.telegram_id
      );
    } catch {
      // Xabarnoma xatosi buyurtmani to'xtatmaydi
    }

    return mapEntityToDTO(createdOrder);
  }

  /**
   * Bitta buyurtma tafsilotlarini olish
   */
  async getOrderById(storeId: number, orderId: number): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(storeId, orderId);
    if (!order) {
      throw new NotFoundError('Buyurtma');
    }
    return mapEntityToDTO(order);
  }

  /**
   * Do'kondor uchun barcha buyurtmalar ro'yxati (filtrlash va paginatsiya bilan)
   */
  async getStoreOrders(
    storeId: number,
    filter: OrderFilterInput
  ): Promise<{ orders: OrderDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    const result = await this.orderRepo.findMany(storeId, {
      status: filter.status,
      customerId: filter.customerId,
      startDate: filter.startDate ? new Date(filter.startDate) : undefined,
      endDate: filter.endDate ? new Date(filter.endDate) : undefined,
      limit,
      offset,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      orders: result.orders.map(mapEntityToDTO),
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Xaridorning o'z buyurtmalari tarixi
   */
  async getCustomerOrders(
    storeId: number,
    userId: number,
    pagination: PaginationInput
  ): Promise<{ orders: OrderDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const offset = (page - 1) * limit;

    const customer = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE store_id = $1 AND user_id = $2',
      [storeId, userId]
    );

    if (!customer) {
      return { orders: [], total: 0, page, limit, totalPages: 0 };
    }

    const customerId = Number(customer.id);
    const result = await this.orderRepo.findMany(storeId, {
      customerId,
      limit,
      offset,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      orders: result.orders.map(mapEntityToDTO),
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Buyurtma holatini yangilash (Admin tomonidan yoki Telegram inline tugma orqali)
   */
  async updateOrderStatus(
    storeId: number,
    orderId: number,
    input: UpdateOrderStatusInput
  ): Promise<OrderDTO> {
    const updated = await this.orderRepo.updateStatus(
      storeId,
      orderId,
      input.status,
      input.cancelReason
    );

    if (!updated) {
      throw new NotFoundError('Buyurtma');
    }

    // Agar bekor qilinib, omborga qaytarilgan bo'lsa, keshni tozalash
    if (input.status === 'cancelled') {
      await cacheService.delPattern(`shop:products:${storeId}:*`);
    }

    // Agar buyurtma yetkazib berilgan bo'lsa, moliyada tushum avtomatik qayd etiladi
    if (input.status === 'delivered') {
      try {
        await this.financeRepo.recordDeliveredOrderIncome(storeId, orderId, updated.total);
      } catch (err) {
        logger.warn('OrderService', `Moliya qaydida ogohlantirish: ${err}`);
      }
    }

    // Xaridorga uning Telegram botida holat o'zgarganligi haqida xabar berish
    try {
      const store = await this.storeRepo.findById(storeId);
      const customerUser = await queryOne<{ telegram_id: number }>(
        `SELECT u.telegram_id 
         FROM customers c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = $1`,
        [updated.customerId]
      );

      if (store && customerUser?.telegram_id) {
        await telegramNotificationService.notifyCustomerStatusChange(
          store.botToken,
          customerUser.telegram_id,
          updated,
          store.name
        );
      }
    } catch {
      // Bildirishnoma xatosi statusni bekor qilmaydi
    }

    return mapEntityToDTO(updated);
  }
}
