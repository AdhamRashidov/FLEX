import { query, queryOne, tx, txQuery } from '../database/pool.js';
import type {
  IOrderRepository,
  CreateOrderParams,
  OrderFilter,
} from '../../core/repositories/order.repository.interface.js';
import type { OrderEntity, OrderItemEntity } from '../../core/entities/order.entity.js';
import type { OrderStatus, PaymentMethod, PaymentStatus, DeliveryType } from '@flex/shared';

interface OrderDbRow {
  id: string;
  store_id: string;
  customer_id: string;
  order_number: number;
  status: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_proof_url: string | null;
  delivery_type: string;
  delivery_address: string | null;
  delivery_lat: string | null;
  delivery_lng: string | null;
  customer_note: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  confirmed_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_count?: string;
}

interface OrderItemDbRow {
  id: string;
  order_id: string;
  product_id: string;
  store_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  created_at: Date;
}

function mapRowToOrderItem(row: OrderItemDbRow): OrderItemEntity {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    productId: Number(row.product_id),
    storeId: Number(row.store_id),
    productName: row.product_name,
    productPrice: row.product_price,
    quantity: row.quantity,
    total: row.total,
    createdAt: row.created_at,
  };
}

function mapRowToOrder(row: OrderDbRow, items: OrderItemEntity[] = []): OrderEntity {
  return {
    id: Number(row.id),
    storeId: Number(row.store_id),
    customerId: Number(row.customer_id),
    customerName: row.customer_name ?? null,
    customerPhone: row.customer_phone ?? null,
    orderNumber: row.order_number,
    status: row.status as OrderStatus,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    discount: row.discount,
    total: row.total,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: row.payment_status as PaymentStatus,
    paymentProofUrl: row.payment_proof_url,
    deliveryType: row.delivery_type as DeliveryType,
    deliveryAddress: row.delivery_address,
    deliveryLat: row.delivery_lat ? Number(row.delivery_lat) : null,
    deliveryLng: row.delivery_lng ? Number(row.delivery_lng) : null,
    customerNote: row.customer_note,
    cancelReason: row.cancel_reason,
    cancelledBy: row.cancelled_by as 'customer' | 'store' | null,
    confirmedAt: row.confirmed_at,
    deliveredAt: row.delivered_at,
    cancelledAt: row.cancelled_at,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgOrderRepository implements IOrderRepository {
  /**
   * Buyurtma elementlarini paketlab yuklash (N+1 muammosini oldini oladi)
   */
  private async loadItemsForOrders(orderIds: number[]): Promise<Map<number, OrderItemEntity[]>> {
    const itemsMap = new Map<number, OrderItemEntity[]>();
    if (orderIds.length === 0) return itemsMap;

    const { rows } = await query<OrderItemDbRow>(
      `SELECT * FROM order_items 
       WHERE order_id = ANY($1::bigint[]) 
       ORDER BY id ASC`,
      [orderIds]
    );

    for (const row of rows) {
      const orderId = Number(row.order_id);
      const items = itemsMap.get(orderId) ?? [];
      items.push(mapRowToOrderItem(row));
      itemsMap.set(orderId, items);
    }

    return itemsMap;
  }

  async findById(storeId: number, id: number): Promise<OrderEntity | null> {
    const row = await queryOne<OrderDbRow>(
      `SELECT o.*, 
              COALESCE(c.phone, u.first_name) as customer_name,
              c.phone as customer_phone
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE o.store_id = $1 AND o.id = $2`,
      [storeId, id]
    );

    if (!row) return null;

    const itemsMap = await this.loadItemsForOrders([Number(row.id)]);
    return mapRowToOrder(row, itemsMap.get(Number(row.id)) ?? []);
  }

  async findByOrderNumber(storeId: number, orderNumber: number): Promise<OrderEntity | null> {
    const row = await queryOne<OrderDbRow>(
      `SELECT o.*, 
              COALESCE(c.phone, u.first_name) as customer_name,
              c.phone as customer_phone
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE o.store_id = $1 AND o.order_number = $2`,
      [storeId, orderNumber]
    );

    if (!row) return null;

    const itemsMap = await this.loadItemsForOrders([Number(row.id)]);
    return mapRowToOrder(row, itemsMap.get(Number(row.id)) ?? []);
  }

  async findMany(
    storeId: number,
    filter: OrderFilter = {}
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    const { status, customerId, startDate, endDate, limit = 20, offset = 0 } = filter;

    const conditions: string[] = ['o.store_id = $1'];
    const params: unknown[] = [storeId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(status);
    }

    if (customerId) {
      conditions.push(`o.customer_id = $${paramIndex++}`);
      params.push(customerId);
    }

    if (startDate) {
      conditions.push(`o.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`o.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    params.push(limit);
    const limitParam = `$${paramIndex++}`;
    params.push(offset);
    const offsetParam = `$${paramIndex++}`;

    const sql = `
      SELECT o.*,
             COALESCE(c.phone, u.first_name) as customer_name,
             c.phone as customer_phone,
             COUNT(*) OVER() AS total_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const { rows } = await query<OrderDbRow>(sql, params);

    if (rows.length === 0) {
      return { orders: [], total: 0 };
    }

    const total = Number(rows[0]?.total_count ?? 0);
    const orderIds = rows.map((r) => Number(r.id));
    const itemsMap = await this.loadItemsForOrders(orderIds);

    const orders = rows.map((r) => mapRowToOrder(r, itemsMap.get(Number(r.id)) ?? []));
    return { orders, total };
  }

  async findByCustomer(
    storeId: number,
    customerId: number,
    limit = 20,
    offset = 0
  ): Promise<OrderEntity[]> {
    const { rows } = await query<OrderDbRow>(
      `SELECT o.*
       FROM orders o
       WHERE o.store_id = $1 AND o.customer_id = $2
       ORDER BY o.created_at DESC
       LIMIT $3 OFFSET $4`,
      [storeId, customerId, limit, offset]
    );

    if (rows.length === 0) return [];

    const orderIds = rows.map((r) => Number(r.id));
    const itemsMap = await this.loadItemsForOrders(orderIds);

    return rows.map((r) => mapRowToOrder(r, itemsMap.get(Number(r.id)) ?? []));
  }

  async getNextOrderNumber(storeId: number): Promise<number> {
    const row = await queryOne<{ max_num: number | null }>(
      'SELECT MAX(order_number) as max_num FROM orders WHERE store_id = $1',
      [storeId]
    );
    return (row?.max_num ?? 0) + 1;
  }

  /**
   * Yangi buyurtma va uning elementlarini yagona tranzaksiyada yaratish
   */
  async createWithItems(params: CreateOrderParams): Promise<OrderEntity> {
    return tx(async (client) => {
      // 1. Yangi tartib raqamini xavfsiz generatsiya qilish (store qatorini qulflash orqali)
      await txQuery(client, 'SELECT id FROM stores WHERE id = $1 FOR UPDATE', [params.storeId]);

      const maxRow = await txQuery<{ max_num: number | null }>(
        client,
        'SELECT MAX(order_number) as max_num FROM orders WHERE store_id = $1',
        [params.storeId]
      );
      const orderNumber = (maxRow.rows[0]?.max_num ?? 0) + 1;

      // 2. Buyurtma asosiy qatorini kiritish
      const orderRes = await txQuery<OrderDbRow>(
        client,
        `INSERT INTO orders (
           store_id, customer_id, order_number, status, subtotal,
           delivery_fee, discount, total, payment_method, payment_status,
           delivery_type, delivery_address, delivery_lat, delivery_lng,
           customer_note
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          params.storeId,
          params.customerId,
          orderNumber,
          'pending',
          params.subtotal,
          params.deliveryFee,
          params.discount,
          params.total,
          params.paymentMethod,
          'unpaid',
          params.deliveryType,
          params.deliveryAddress ?? null,
          params.deliveryLat ?? null,
          params.deliveryLng ?? null,
          params.customerNote ?? null,
        ]
      );

      const orderRow = orderRes.rows[0];
      if (!orderRow) throw new Error('Buyurtma yaratib bo\'lmadi');
      const orderId = Number(orderRow.id);

      // 3. Buyurtma elementlarini kiritish
      const insertedItems: OrderItemEntity[] = [];

      for (const item of params.items) {
        const itemRes = await txQuery<OrderItemDbRow>(
          client,
          `INSERT INTO order_items (
             order_id, product_id, store_id, product_name, product_price, quantity, total
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            orderId,
            item.productId,
            params.storeId,
            item.productName,
            item.productPrice,
            item.quantity,
            item.total,
          ]
        );
        const itemRow = itemRes.rows[0];
        if (itemRow) {
          insertedItems.push(mapRowToOrderItem(itemRow));
        }
      }

      // 4. Mijoz statistikasini yangilash (jami buyurtmalar soni va sarflangan mablag')
      await txQuery(
        client,
        `UPDATE customers
         SET total_orders = total_orders + 1,
             total_spent = total_spent + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [params.total, params.customerId]
      );

      return mapRowToOrder(orderRow, insertedItems);
    });
  }

  /**
   * Buyurtma statusini yangilash (Tranzaksiyada, agar bekor qilinsa ombor qoldig'ini tiklaydi)
   */
  async updateStatus(
    storeId: number,
    id: number,
    status: OrderStatus,
    cancelReason?: string
  ): Promise<OrderEntity | null> {
    return tx(async (client) => {
      // Mavjud buyurtmani qulflash
      const existingRes = await txQuery<OrderDbRow>(
        client,
        'SELECT * FROM orders WHERE store_id = $1 AND id = $2 FOR UPDATE',
        [storeId, id]
      );
      const existing = existingRes.rows[0];
      if (!existing) return null;

      const oldStatus = existing.status as OrderStatus;

      // Agar bekor qilinayotgan bo'lsa va avval bekor qilinmagan bo'lsa: ombor qoldiqlarini qaytarish
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        const itemsRes = await txQuery<OrderItemDbRow>(
          client,
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [id]
        );

        for (const item of itemsRes.rows) {
          await txQuery(
            client,
            `UPDATE products
             SET stock_quantity = stock_quantity + $1,
                 updated_at = NOW()
             WHERE id = $2 AND store_id = $3 AND track_stock = true`,
            [item.quantity, Number(item.product_id), storeId]
          );
        }
      }

      // Statusga qarab tegishli vaqt tamg'alarini belgilash
      let extraSet = '';
      if (status === 'confirmed' && !existing.confirmed_at) {
        extraSet = ', confirmed_at = NOW()';
      } else if (status === 'delivered' && !existing.delivered_at) {
        extraSet = ', delivered_at = NOW()';
      } else if (status === 'cancelled' && !existing.cancelled_at) {
        extraSet = ', cancelled_at = NOW(), cancelled_by = \'store\', cancel_reason = $3';
      }

      const queryParams: unknown[] = [status, id];
      if (status === 'cancelled') {
        queryParams.push(cancelReason ?? null);
      }

      const updateSql = `
        UPDATE orders
        SET status = $1,
            updated_at = NOW()
            ${extraSet}
        WHERE id = $2
        RETURNING *
      `;

      const updatedRes = await txQuery<OrderDbRow>(client, updateSql, queryParams);
      const updatedRow = updatedRes.rows[0];
      if (!updatedRow) return null;

      const itemsRes = await txQuery<OrderItemDbRow>(
        client,
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC',
        [id]
      );
      const items = itemsRes.rows.map(mapRowToOrderItem);

      return mapRowToOrder(updatedRow, items);
    });
  }

  async updatePaymentStatus(
    storeId: number,
    id: number,
    status: PaymentStatus,
    proofUrl?: string
  ): Promise<OrderEntity | null> {
    const row = await queryOne<OrderDbRow>(
      `UPDATE orders
       SET payment_status = $1,
           payment_proof_url = COALESCE($2, payment_proof_url),
           updated_at = NOW()
       WHERE store_id = $3 AND id = $4
       RETURNING *`,
      [status, proofUrl ?? null, storeId, id]
    );

    if (!row) return null;

    const itemsMap = await this.loadItemsForOrders([Number(row.id)]);
    return mapRowToOrder(row, itemsMap.get(Number(row.id)) ?? []);
  }
}
