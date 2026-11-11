import { query, queryOne } from '../database/pool.js';
import type {
  IFinanceRepository,
  CreateTransactionParams,
  TransactionFilterParams,
  SalesReportPeriodParams,
} from '../../core/repositories/finance.repository.interface.js';
import type {
  TransactionEntity,
  FinanceSummaryEntity,
  SalesChartPointEntity,
  TopProductEntity,
  CategorySalesEntity,
} from '../../core/entities/transaction.entity.js';
import type { TransactionType } from '@flex/shared';

interface TransactionDbRow {
  id: string;
  store_id: string;
  order_id: string | null;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  created_at: Date;
  total_count?: string;
}

function mapRowToTransaction(row: TransactionDbRow): TransactionEntity {
  return {
    id: Number(row.id),
    storeId: Number(row.store_id),
    orderId: row.order_id ? Number(row.order_id) : null,
    type: row.type as TransactionType,
    category: row.category,
    amount: Number(row.amount),
    description: row.description,
    createdAt: row.created_at,
  };
}

export class PgFinanceRepository implements IFinanceRepository {
  /**
   * Yangi tranzaksiya kiritish (Kirim yoki Chiqim)
   */
  async create(
    storeId: number,
    params: CreateTransactionParams
  ): Promise<TransactionEntity> {
    const row = await queryOne<TransactionDbRow>(
      `INSERT INTO transactions (
         store_id, order_id, type, category, amount, description
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, store_id, order_id, type, category, amount, description, created_at`,
      [
        storeId,
        params.orderId ?? null,
        params.type,
        params.category,
        params.amount,
        params.description ?? null,
      ]
    );

    if (!row) {
      throw new Error('Tranzaksiya yaratib bo\'lmadi');
    }

    return mapRowToTransaction(row);
  }

  /**
   * ID bo'yicha tranzaksiyani topish
   */
  async findById(storeId: number, id: number): Promise<TransactionEntity | null> {
    const row = await queryOne<TransactionDbRow>(
      `SELECT id, store_id, order_id, type, category, amount, description, created_at
       FROM transactions
       WHERE store_id = $1 AND id = $2`,
      [storeId, id]
    );

    return row ? mapRowToTransaction(row) : null;
  }

  /**
   * Tranzaksiyalar ro'yxatini filtrlash va paginatsiya bilan olish
   */
  async findMany(
    storeId: number,
    filter: TransactionFilterParams
  ): Promise<{ transactions: TransactionEntity[]; total: number }> {
    const conditions: string[] = ['store_id = $1'];
    const params: unknown[] = [storeId];
    let idx = 2;

    if (filter.type) {
      conditions.push(`type = $${idx++}`);
      params.push(filter.type);
    }

    if (filter.category) {
      conditions.push(`category = $${idx++}`);
      params.push(filter.category);
    }

    if (filter.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filter.startDate);
    }

    if (filter.endDate) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filter.endDate);
    }

    const whereClause = conditions.join(' AND ');

    params.push(filter.limit);
    const limitIdx = idx++;
    params.push(filter.offset);
    const offsetIdx = idx++;

    const sql = `
      SELECT 
        id, store_id, order_id, type, category, amount, description, created_at,
        COUNT(*) OVER() AS total_count
      FROM transactions
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await query<TransactionDbRow>(sql, params);
    const total = rows.length > 0 ? parseInt(rows[0]?.total_count || '0', 10) : 0;

    return {
      transactions: rows.map(mapRowToTransaction),
      total,
    };
  }

  /**
   * Do'konning umumiy moliya xulosasi (Summary)
   */
  async getSummary(storeId: number): Promise<FinanceSummaryEntity> {
    // 1. Tranzaksiyalardan hisob-kitoblar (Barcha vaqt, bugun, bu hafta, bu oy)
    const txStats = await queryOne<{
      total_income: string;
      total_expense: string;
      today_income: string;
      today_expense: string;
      week_income: string;
      week_expense: string;
      month_income: string;
      month_expense: string;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
         COALESCE(SUM(CASE WHEN type = 'income' AND created_at >= DATE_TRUNC('day', NOW()) THEN amount ELSE 0 END), 0) AS today_income,
         COALESCE(SUM(CASE WHEN type = 'expense' AND created_at >= DATE_TRUNC('day', NOW()) THEN amount ELSE 0 END), 0) AS today_expense,
         COALESCE(SUM(CASE WHEN type = 'income' AND created_at >= DATE_TRUNC('week', NOW()) THEN amount ELSE 0 END), 0) AS week_income,
         COALESCE(SUM(CASE WHEN type = 'expense' AND created_at >= DATE_TRUNC('week', NOW()) THEN amount ELSE 0 END), 0) AS week_expense,
         COALESCE(SUM(CASE WHEN type = 'income' AND created_at >= DATE_TRUNC('month', NOW()) THEN amount ELSE 0 END), 0) AS month_income,
         COALESCE(SUM(CASE WHEN type = 'expense' AND created_at >= DATE_TRUNC('month', NOW()) THEN amount ELSE 0 END), 0) AS month_expense
       FROM transactions
       WHERE store_id = $1`,
      [storeId]
    );

    // 2. Buyurtmalardan hisob-kitoblar (Bugungi buyurtmalar, kutilayotganlar, AOV)
    const orderStats = await queryOne<{
      today_orders_count: string;
      delivered_orders_count: string;
      delivered_orders_total: string;
      pending_orders_count: string;
      pending_orders_amount: string;
    }>(
      `SELECT
         COUNT(CASE WHEN created_at >= DATE_TRUNC('day', NOW()) AND status != 'cancelled' THEN 1 END) AS today_orders_count,
         COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_orders_count,
         COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS delivered_orders_total,
         COUNT(CASE WHEN status IN ('pending', 'confirmed', 'preparing', 'delivering') THEN 1 END) AS pending_orders_count,
         COALESCE(SUM(CASE WHEN status IN ('pending', 'confirmed', 'preparing', 'delivering') THEN total ELSE 0 END), 0) AS pending_orders_amount
       FROM orders
       WHERE store_id = $1`,
      [storeId]
    );

    const totalIncome = Number(txStats?.total_income || 0);
    const totalExpense = Number(txStats?.total_expense || 0);
    const totalBalance = totalIncome - totalExpense;

    const deliveredOrdersCount = Number(orderStats?.delivered_orders_count || 0);
    const deliveredOrdersTotal = Number(orderStats?.delivered_orders_total || 0);
    const averageOrderValue = deliveredOrdersCount > 0 ? Math.round(deliveredOrdersTotal / deliveredOrdersCount) : 0;

    return {
      totalBalance,
      totalIncome,
      totalExpense,
      todayIncome: Number(txStats?.today_income || 0),
      todayExpense: Number(txStats?.today_expense || 0),
      todayOrdersCount: Number(orderStats?.today_orders_count || 0),
      weekIncome: Number(txStats?.week_income || 0),
      weekExpense: Number(txStats?.week_expense || 0),
      monthIncome: Number(txStats?.month_income || 0),
      monthExpense: Number(txStats?.month_expense || 0),
      averageOrderValue,
      pendingOrdersCount: Number(orderStats?.pending_orders_count || 0),
      pendingOrdersAmount: Number(orderStats?.pending_orders_amount || 0),
    };
  }

  /**
   * Sotuvlar dinamikasi hisoboti (Chart ma'lumotlari)
   * Bo'sh kunlarni 0 qiymat bilan to'ldirish uchun generate_series ishlatiladi
   */
  async getSalesReport(
    storeId: number,
    params: SalesReportPeriodParams
  ): Promise<SalesChartPointEntity[]> {
    let seriesSql = '';
    let dateFormat = '';
    let intervalStr = '';
    const queryParams: unknown[] = [storeId];

    if (params.period === 'weekly') {
      seriesSql = `generate_series(DATE_TRUNC('week', NOW()) - INTERVAL '11 weeks', DATE_TRUNC('week', NOW()), INTERVAL '1 week') AS slot`;
      dateFormat = 'YYYY-"W"IW';
      intervalStr = '1 week';
    } else if (params.period === 'monthly') {
      seriesSql = `generate_series(DATE_TRUNC('month', NOW()) - INTERVAL '11 months', DATE_TRUNC('month', NOW()), INTERVAL '1 month') AS slot`;
      dateFormat = 'YYYY-MM';
      intervalStr = '1 month';
    } else if (params.period === 'custom' && params.startDate && params.endDate) {
      queryParams.push(params.startDate);
      queryParams.push(params.endDate);
      seriesSql = `generate_series(DATE_TRUNC('day', $2::timestamptz), DATE_TRUNC('day', $3::timestamptz), INTERVAL '1 day') AS slot`;
      dateFormat = 'YYYY-MM-DD';
      intervalStr = '1 day';
    } else {
      // Default: daily (Oxirgi 30 kun)
      seriesSql = `generate_series(DATE_TRUNC('day', NOW()) - INTERVAL '29 days', DATE_TRUNC('day', NOW()), INTERVAL '1 day') AS slot`;
      dateFormat = 'YYYY-MM-DD';
      intervalStr = '1 day';
    }

    const sql = `
      WITH time_slots AS (
        SELECT ${seriesSql}
      ),
      order_aggregates AS (
        SELECT 
          DATE_TRUNC('${intervalStr.includes('week') ? 'week' : intervalStr.includes('month') ? 'month' : 'day'}', created_at) AS slot,
          COUNT(*)::integer AS orders_count,
          COALESCE(SUM(total), 0)::integer AS total_sales
        FROM orders
        WHERE store_id = $1 AND status != 'cancelled'
        GROUP BY 1
      ),
      tx_aggregates AS (
        SELECT 
          DATE_TRUNC('${intervalStr.includes('week') ? 'week' : intervalStr.includes('month') ? 'month' : 'day'}', created_at) AS slot,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::integer AS income_amount,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::integer AS expense_amount
        FROM transactions
        WHERE store_id = $1
        GROUP BY 1
      )
      SELECT 
        TO_CHAR(ts.slot, '${dateFormat}') AS date_label,
        COALESCE(oa.orders_count, 0) AS orders_count,
        COALESCE(oa.total_sales, 0) AS total_sales,
        COALESCE(tx.income_amount, 0) AS net_income,
        COALESCE(tx.expense_amount, 0) AS expenses
      FROM time_slots ts
      LEFT JOIN order_aggregates oa ON oa.slot = ts.slot
      LEFT JOIN tx_aggregates tx ON tx.slot = ts.slot
      ORDER BY ts.slot ASC
    `;

    const { rows } = await query<{
      date_label: string;
      orders_count: number;
      total_sales: number;
      net_income: number;
      expenses: number;
    }>(sql, queryParams);

    return rows.map((r) => ({
      date: r.date_label,
      ordersCount: Number(r.orders_count),
      totalSales: Number(r.total_sales),
      netIncome: Number(r.net_income),
      expenses: Number(r.expenses),
    }));
  }

  /**
   * Eng ko'p sotilgan tovarlar hisoboti (Top Products)
   */
  async getTopProducts(
    storeId: number,
    period: 'today' | 'week' | 'month' | 'year' | 'all',
    limit: number
  ): Promise<TopProductEntity[]> {
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'day\', NOW())';
    } else if (period === 'week') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'week\', NOW())';
    } else if (period === 'month') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'month\', NOW())';
    } else if (period === 'year') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'year\', NOW())';
    }

    const sql = `
      WITH ranked_sales AS (
        SELECT 
          oi.product_id,
          oi.product_name,
          COALESCE(SUM(oi.quantity), 0)::integer AS total_quantity,
          COALESCE(SUM(oi.total), 0)::integer AS total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.store_id = $1 
          AND o.status != 'cancelled'
          ${dateFilter}
        GROUP BY oi.product_id, oi.product_name
      ),
      totals AS (
        SELECT COALESCE(SUM(total_revenue), 0)::numeric AS grand_total
        FROM ranked_sales
      )
      SELECT 
        rs.product_id,
        rs.product_name,
        (
          SELECT url FROM product_images pi 
          WHERE pi.product_id = rs.product_id 
          ORDER BY pi.is_primary DESC, pi.id ASC 
          LIMIT 1
        ) AS image_url,
        rs.total_quantity,
        rs.total_revenue,
        CASE 
          WHEN t.grand_total > 0 THEN ROUND((rs.total_revenue / t.grand_total) * 100, 1)::float
          ELSE 0::float 
        END AS percentage
      FROM ranked_sales rs
      CROSS JOIN totals t
      ORDER BY rs.total_revenue DESC
      LIMIT $2
    `;

    const { rows } = await query<{
      product_id: string;
      product_name: string;
      image_url: string | null;
      total_quantity: number;
      total_revenue: number;
      percentage: number;
    }>(sql, [storeId, limit]);

    return rows.map((r) => ({
      productId: Number(r.product_id),
      productName: r.product_name,
      imageUrl: r.image_url,
      totalQuantity: Number(r.total_quantity),
      totalRevenue: Number(r.total_revenue),
      percentage: Number(r.percentage),
    }));
  }

  /**
   * Kategoriyalar bo'yicha sotuv ulushi
   */
  async getCategorySales(
    storeId: number,
    period: 'today' | 'week' | 'month' | 'year' | 'all'
  ): Promise<CategorySalesEntity[]> {
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'day\', NOW())';
    } else if (period === 'week') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'week\', NOW())';
    } else if (period === 'month') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'month\', NOW())';
    } else if (period === 'year') {
      dateFilter = 'AND o.created_at >= DATE_TRUNC(\'year\', NOW())';
    }

    const sql = `
      WITH cat_sales AS (
        SELECT 
          c.id AS category_id,
          COALESCE(c.name, 'Kategoriyasiz') AS category_name,
          COALESCE(SUM(oi.quantity), 0)::integer AS total_quantity,
          COALESCE(SUM(oi.total), 0)::integer AS total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE o.store_id = $1 
          AND o.status != 'cancelled'
          ${dateFilter}
        GROUP BY c.id, c.name
      ),
      totals AS (
        SELECT COALESCE(SUM(total_revenue), 0)::numeric AS grand_total
        FROM cat_sales
      )
      SELECT 
        cs.category_id,
        cs.category_name,
        cs.total_quantity,
        cs.total_revenue,
        CASE 
          WHEN t.grand_total > 0 THEN ROUND((cs.total_revenue / t.grand_total) * 100, 1)::float
          ELSE 0::float 
        END AS percentage
      FROM cat_sales cs
      CROSS JOIN totals t
      ORDER BY cs.total_revenue DESC
    `;

    const { rows } = await query<{
      category_id: string | null;
      category_name: string;
      total_quantity: number;
      total_revenue: number;
      percentage: number;
    }>(sql, [storeId]);

    return rows.map((r) => ({
      categoryId: r.category_id ? Number(r.category_id) : null,
      categoryName: r.category_name,
      totalQuantity: Number(r.total_quantity),
      totalRevenue: Number(r.total_revenue),
      percentage: Number(r.percentage),
    }));
  }

  /**
   * Buyurtma yetkazilganda (delivered) avtomatik daromad tranzaksiyasini qayd etish
   */
  async recordDeliveredOrderIncome(
    storeId: number,
    orderId: number,
    amount: number
  ): Promise<TransactionEntity | null> {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM transactions WHERE store_id = $1 AND order_id = $2 AND category = \'sale\'',
      [storeId, orderId]
    );

    if (existing) {
      return null;
    }

    return this.create(storeId, {
      orderId,
      type: 'income',
      category: 'sale',
      amount,
      description: `Buyurtma #${orderId} uchun to'lov tushumi`,
    });
  }
}
