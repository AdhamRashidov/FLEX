import { pool, query, queryOne } from '../../infrastructure/database/pool.js';
import { cacheService, redisManager } from '../../infrastructure/cache/redis.js';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import type {
  SuperDashboardDTO,
  SuperStoreListItemDTO,
  GlobalCatalogItemDTO,
  SuperUserListItemDTO,
  StoreStatus,
  CreateGlobalCatalogItemInput,
  UpdateGlobalCatalogItemInput,
} from '@flex/shared';

export class SuperService {
  /**
   * Platformaning umumiy monitoring va statistika ko'rsatkichlari (Dashboard)
   */
  async getDashboard(): Promise<SuperDashboardDTO> {
    // 1. Do'konlar soni va holati
    const storeStats = await queryOne<{
      total: string;
      active: string;
      inactive: string;
      suspended: string;
    }>(`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::integer AS active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END)::integer AS inactive,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END)::integer AS suspended
      FROM stores
    `);

    // 2. Platforma bo'yicha umumiy aylanma (GMV) va buyurtmalar soni
    const orderStats = await queryOne<{
      total_gmv: string;
      total_orders: string;
      today_orders: string;
      today_gmv: string;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0)::bigint AS total_gmv,
        COUNT(*)::integer AS total_orders,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('day', NOW()) THEN 1 END)::integer AS today_orders,
        COALESCE(SUM(CASE WHEN status = 'delivered' AND created_at >= DATE_TRUNC('day', NOW()) THEN total ELSE 0 END), 0)::bigint AS today_gmv
      FROM orders
    `);

    // 3. Foydalanuvchilar soni
    const userStats = await queryOne<{ total: string }>(
      'SELECT COUNT(*)::integer AS total FROM users'
    );

    // 4. Tizim va runtime holati
    const memoryUsage = process.memoryUsage();
    const memoryMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    return {
      stores: {
        total: Number(storeStats?.total || 0),
        active: Number(storeStats?.active || 0),
        inactive: Number(storeStats?.inactive || 0),
        suspended: Number(storeStats?.suspended || 0),
      },
      metrics: {
        totalGmv: Number(orderStats?.total_gmv || 0),
        totalOrders: Number(orderStats?.total_orders || 0),
        totalUsers: Number(userStats?.total || 0),
        todayOrders: Number(orderStats?.today_orders || 0),
        todayGmv: Number(orderStats?.today_gmv || 0),
      },
      system: {
        status: 'healthy',
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        memoryMb,
        postgresPoolTotal: pool.totalCount,
        postgresPoolIdle: pool.idleCount,
        redisConnected: redisManager.isReady(),
      },
    };
  }

  /**
   * Barcha do'konlar ro'yxati (qidiruv, filter, paginatsiya)
   */
  async listStores(params: {
    search?: string;
    status?: StoreStatus;
    page?: number;
    limit?: number;
  }): Promise<{ stores: SuperStoreListItemDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const queryParams: unknown[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(s.name ILIKE $${idx} OR s.slug ILIKE $${idx} OR s.phone ILIKE $${idx})`);
      queryParams.push(`%${params.search}%`);
      idx++;
    }

    if (params.status) {
      conditions.push(`s.status = $${idx}`);
      queryParams.push(params.status);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    queryParams.push(limit);
    const limitIdx = idx++;
    queryParams.push(offset);
    const offsetIdx = idx++;

    const sql = `
      SELECT
        s.id,
        s.name,
        s.slug,
        s.status,
        s.owner_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') AS owner_name,
        s.phone AS owner_phone,
        s.bot_username,
        s.pos_enabled,
        s.created_at,
        COUNT(DISTINCT o.id)::integer AS total_orders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END), 0)::bigint AS total_gmv,
        COUNT(DISTINCT p.id)::integer AS products_count,
        COUNT(*) OVER() AS total_count
      FROM stores s
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN orders o ON o.store_id = s.id
      LEFT JOIN products p ON p.store_id = s.id
      WHERE ${whereClause}
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await query<{
      id: string;
      name: string;
      slug: string;
      status: string;
      owner_id: string;
      owner_name: string;
      owner_phone: string | null;
      bot_username: string | null;
      pos_enabled: boolean;
      created_at: Date;
      total_orders: string;
      total_gmv: string;
      products_count: string;
      total_count?: string;
    }>(sql, queryParams);

    const total = rows.length > 0 ? parseInt(rows[0]?.total_count || '0', 10) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      stores: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        slug: r.slug,
        status: r.status as StoreStatus,
        ownerId: Number(r.owner_id),
        ownerName: r.owner_name.trim(),
        ownerPhone: r.owner_phone,
        botUsername: r.bot_username,
        posEnabled: r.pos_enabled,
        totalOrders: Number(r.total_orders),
        totalGmv: Number(r.total_gmv),
        productsCount: Number(r.products_count),
        createdAt: r.created_at.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Bitta do'konning to'liq tafsiloti
   */
  async getStoreDetails(id: number) {
    const store = await queryOne<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      phone: string | null;
      status: string;
      bot_token: string;
      bot_username: string | null;
      pos_api_key: string | null;
      pos_enabled: boolean;
      pos_last_sync_at: Date | null;
      created_at: Date;
      owner_id: string;
      owner_first_name: string;
      owner_username: string | null;
      owner_telegram_id: string;
    }>(`
      SELECT 
        s.*,
        u.first_name AS owner_first_name,
        u.username AS owner_username,
        u.telegram_id AS owner_telegram_id
      FROM stores s
      JOIN users u ON u.id = s.owner_id
      WHERE s.id = $1
    `, [id]);

    if (!store) {
      throw new NotFoundError('Do\'kon');
    }

    // Do'kon ko'rsatkichlari
    const metrics = await queryOne<{
      total_orders: string;
      total_gmv: string;
      total_products: string;
      total_customers: string;
    }>(`
      SELECT
        (SELECT COUNT(*)::integer FROM orders WHERE store_id = $1) AS total_orders,
        (SELECT COALESCE(SUM(total), 0)::bigint FROM orders WHERE store_id = $1 AND status = 'delivered') AS total_gmv,
        (SELECT COUNT(*)::integer FROM products WHERE store_id = $1) AS total_products,
        (SELECT COUNT(*)::integer FROM customers WHERE store_id = $1) AS total_customers
    `, [id]);

    return {
      id: Number(store.id),
      name: store.name,
      slug: store.slug,
      description: store.description,
      phone: store.phone,
      status: store.status as StoreStatus,
      botUsername: store.bot_username,
      posApiKey: store.pos_api_key,
      posEnabled: store.pos_enabled,
      posLastSyncAt: store.pos_last_sync_at ? store.pos_last_sync_at.toISOString() : null,
      createdAt: store.created_at.toISOString(),
      owner: {
        id: Number(store.owner_id),
        firstName: store.owner_first_name,
        username: store.owner_username,
        telegramId: Number(store.owner_telegram_id),
      },
      metrics: {
        totalOrders: Number(metrics?.total_orders || 0),
        totalGmv: Number(metrics?.total_gmv || 0),
        totalProducts: Number(metrics?.total_products || 0),
        totalCustomers: Number(metrics?.total_customers || 0),
      },
    };
  }

  /**
   * Do'kon holatini o'zgartirish (Faollashtirish, to'xtatish yoki bloklash)
   */
  async updateStoreStatus(id: number, status: StoreStatus) {
    const res = await queryOne<{ id: string; status: string }>(
      `UPDATE stores
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [status, id]
    );

    if (!res) {
      throw new NotFoundError('Do\'kon');
    }

    // Keshni tozalash
    await cacheService.delPattern(`shop:products:${id}:*`);

    return { id: Number(res.id), status: res.status as StoreStatus };
  }

  /**
   * Global Katalog tovarlarini ko'rish (Paginatsiya va qidiruv)
   */
  async listGlobalCatalog(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: GlobalCatalogItemDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const queryParams: unknown[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(name ILIKE $${idx} OR barcode = $${idx + 1} OR brand ILIKE $${idx})`);
      queryParams.push(`%${params.search}%`);
      queryParams.push(params.search.trim());
      idx += 2;
    }

    if (params.category) {
      conditions.push(`category ILIKE $${idx}`);
      queryParams.push(`%${params.category}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    queryParams.push(limit);
    const limitIdx = idx++;
    queryParams.push(offset);
    const offsetIdx = idx++;

    const sql = `
      SELECT
        id, name, barcode, category, brand, unit, image_url, description, created_at,
        COUNT(*) OVER() AS total_count
      FROM global_catalog
      WHERE ${whereClause}
      ORDER BY id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await query<{
      id: string;
      name: string;
      barcode: string | null;
      category: string | null;
      brand: string | null;
      unit: string;
      image_url: string | null;
      description: string | null;
      created_at: Date;
      total_count?: string;
    }>(sql, queryParams);

    const total = rows.length > 0 ? parseInt(rows[0]?.total_count || '0', 10) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        barcode: r.barcode,
        category: r.category,
        brand: r.brand,
        unit: r.unit,
        imageUrl: r.image_url,
        description: r.description,
        createdAt: r.created_at.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Global Katalogga yangi mahsulot shabloni qo'shish (Super Admin)
   */
  async createGlobalCatalogItem(input: CreateGlobalCatalogItemInput): Promise<GlobalCatalogItemDTO> {
    if (input.barcode) {
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM global_catalog WHERE barcode = $1',
        [input.barcode.trim()]
      );
      if (existing) {
        throw new ConflictError('Ushbu shtrix-kod bilan mahsulot global katalogda allaqachon mavjud');
      }
    }

    const row = await queryOne<{
      id: string;
      name: string;
      barcode: string | null;
      category: string | null;
      brand: string | null;
      unit: string;
      image_url: string | null;
      description: string | null;
      created_at: Date;
    }>(`
      INSERT INTO global_catalog (name, barcode, category, brand, unit, image_url, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, barcode, category, brand, unit, image_url, description, created_at
    `, [
      input.name.trim(),
      input.barcode ? input.barcode.trim() : null,
      input.category ? input.category.trim() : null,
      input.brand ? input.brand.trim() : null,
      input.unit || 'dona',
      input.imageUrl ? input.imageUrl.trim() : null,
      input.description ? input.description.trim() : null,
    ]);

    if (!row) throw new Error('Global katalog tovarini yaratib bo\'lmadi');

    return {
      id: Number(row.id),
      name: row.name,
      barcode: row.barcode,
      category: row.category,
      brand: row.brand,
      unit: row.unit,
      imageUrl: row.image_url,
      description: row.description,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Global Katalog tovarini tahrirlash (Ayniqsa tiniq studiya rasmini yangilash)
   */
  async updateGlobalCatalogItem(id: number, input: UpdateGlobalCatalogItemInput): Promise<GlobalCatalogItemDTO> {
    const existing = await queryOne<{ id: string }>('SELECT id FROM global_catalog WHERE id = $1', [id]);
    if (!existing) {
      throw new NotFoundError('Global katalog tovari');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(input.name.trim());
    }
    if (input.barcode !== undefined) {
      updates.push(`barcode = $${idx++}`);
      params.push(input.barcode ? input.barcode.trim() : null);
    }
    if (input.category !== undefined) {
      updates.push(`category = $${idx++}`);
      params.push(input.category ? input.category.trim() : null);
    }
    if (input.brand !== undefined) {
      updates.push(`brand = $${idx++}`);
      params.push(input.brand ? input.brand.trim() : null);
    }
    if (input.unit !== undefined) {
      updates.push(`unit = $${idx++}`);
      params.push(input.unit.trim());
    }
    if (input.imageUrl !== undefined) {
      updates.push(`image_url = $${idx++}`);
      params.push(input.imageUrl ? input.imageUrl.trim() : null);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(input.description ? input.description.trim() : null);
    }

    if (updates.length === 0) {
      return (await this.listGlobalCatalog({ limit: 1 })).items[0]!;
    }

    params.push(id);
    const sql = `
      UPDATE global_catalog
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, barcode, category, brand, unit, image_url, description, created_at
    `;

    const row = await queryOne<{
      id: string;
      name: string;
      barcode: string | null;
      category: string | null;
      brand: string | null;
      unit: string;
      image_url: string | null;
      description: string | null;
      created_at: Date;
    }>(sql, params);

    if (!row) throw new NotFoundError('Global katalog tovari');

    return {
      id: Number(row.id),
      name: row.name,
      barcode: row.barcode,
      category: row.category,
      brand: row.brand,
      unit: row.unit,
      imageUrl: row.image_url,
      description: row.description,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Global Katalog tovarini o'chirish
   */
  async deleteGlobalCatalogItem(id: number): Promise<{ success: boolean }> {
    const res = await query('DELETE FROM global_catalog WHERE id = $1', [id]);
    if (res.rowCount === 0) {
      throw new NotFoundError('Global katalog tovari');
    }
    return { success: true };
  }

  /**
   * Platformadagi barcha foydalanuvchilar ro'yxati
   */
  async listUsers(params: {
    search?: string;
    isSuperAdmin?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ users: SuperUserListItemDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const queryParams: unknown[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.username ILIKE $${idx})`);
      queryParams.push(`%${params.search}%`);
      idx++;
    }

    if (params.isSuperAdmin !== undefined) {
      conditions.push(`u.is_super_admin = $${idx}`);
      queryParams.push(params.isSuperAdmin);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    queryParams.push(limit);
    const limitIdx = idx++;
    queryParams.push(offset);
    const offsetIdx = idx++;

    const sql = `
      SELECT
        u.id,
        u.telegram_id,
        u.first_name,
        u.last_name,
        u.username,
        u.is_super_admin,
        u.created_at,
        COUNT(s.id)::integer AS owned_stores_count,
        COUNT(*) OVER() AS total_count
      FROM users u
      LEFT JOIN stores s ON s.owner_id = u.id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await query<{
      id: string;
      telegram_id: string;
      first_name: string;
      last_name: string | null;
      username: string | null;
      is_super_admin: boolean;
      created_at: Date;
      owned_stores_count: string;
      total_count?: string;
    }>(sql, queryParams);

    const total = rows.length > 0 ? parseInt(rows[0]?.total_count || '0', 10) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      users: rows.map((r) => ({
        id: Number(r.id),
        telegramId: Number(r.telegram_id),
        firstName: r.first_name,
        lastName: r.last_name,
        username: r.username,
        isSuperAdmin: r.is_super_admin,
        ownedStoresCount: Number(r.owned_stores_count),
        createdAt: r.created_at.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Foydalanuvchini Super Admin etib tayinlash yoki bekor qilish
   */
  async setUserSuperAdmin(userId: number, isSuperAdmin: boolean): Promise<{ success: boolean; isSuperAdmin: boolean }> {
    const res = await query('UPDATE users SET is_super_admin = $1 WHERE id = $2', [isSuperAdmin, userId]);
    if (res.rowCount === 0) {
      throw new NotFoundError('Foydalanuvchi');
    }
    return { success: true, isSuperAdmin };
  }
}
