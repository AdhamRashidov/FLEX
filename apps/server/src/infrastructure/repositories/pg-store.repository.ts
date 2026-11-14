import { query, queryOne } from '../../infrastructure/database/pool.js';
import type { IStoreRepository, CreateStoreData } from '../../core/repositories/store.repository.interface.js';
import type { StoreEntity } from '../../core/entities/store.entity.js';
import type { StoreStatus } from '@flex/shared';

interface StoreDbRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  bot_token: string | null;
  bot_username: string | null;
  webapp_url: string | null;
  working_hours: Record<string, { open: string; close: string }> | null;
  delivery_enabled: boolean;
  delivery_radius_km: string;
  delivery_price: number;
  min_order_amount: number;
  latitude: string | null;
  longitude: string | null;
  status: string;
  payment_card_number: string | null;
  payment_card_holder: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToStoreEntity(row: StoreDbRow): StoreEntity {
  return {
    id: Number(row.id),
    ownerId: Number(row.owner_id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    phone: row.phone,
    botToken: row.bot_token,
    botUsername: row.bot_username,
    webappUrl: row.webapp_url,
    workingHours: row.working_hours,
    deliveryEnabled: row.delivery_enabled,
    deliveryRadiusKm: Number(row.delivery_radius_km),
    deliveryPrice: Number(row.delivery_price),
    minOrderAmount: Number(row.min_order_amount),
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    status: row.status as StoreStatus,
    paymentCardNumber: row.payment_card_number,
    paymentCardHolder: row.payment_card_holder,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgStoreRepository implements IStoreRepository {
  async findById(id: number): Promise<StoreEntity | null> {
    const row = await queryOne<StoreDbRow>(
      `SELECT * FROM stores WHERE id = $1`,
      [id]
    );
    return row ? mapRowToStoreEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<StoreEntity | null> {
    const row = await queryOne<StoreDbRow>(
      `SELECT * FROM stores WHERE slug = $1`,
      [slug.toLowerCase().trim()]
    );
    return row ? mapRowToStoreEntity(row) : null;
  }

  async findByBotToken(botToken: string): Promise<StoreEntity | null> {
    const row = await queryOne<StoreDbRow>(
      `SELECT * FROM stores WHERE bot_token = $1`,
      [botToken.trim()]
    );
    return row ? mapRowToStoreEntity(row) : null;
  }

  async findByOwnerId(ownerId: number): Promise<StoreEntity[]> {
    const res = await query<StoreDbRow>(
      `SELECT * FROM stores WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId]
    );
    return res.rows.map(mapRowToStoreEntity);
  }

  async create(data: CreateStoreData): Promise<StoreEntity> {
    const res = await query<StoreDbRow>(
      `INSERT INTO stores (
        owner_id, name, slug, description, phone, bot_token, bot_username,
        webapp_url, delivery_enabled, delivery_radius_km, delivery_price, min_order_amount, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
      RETURNING *`,
      [
        data.ownerId,
        data.name.trim(),
        data.slug.toLowerCase().trim(),
        data.description ?? null,
        data.phone ?? null,
        data.botToken?.trim() ?? null,
        data.botUsername?.trim() ?? null,
        data.webappUrl?.trim() ?? null,
        data.deliveryEnabled ?? true,
        data.deliveryRadiusKm ?? 5.0,
        data.deliveryPrice ?? 0,
        data.minOrderAmount ?? 0,
      ]
    );

    const row = res.rows[0];
    if (!row) throw new Error('Do\'kon yaratib bo\'lmadi');
    return mapRowToStoreEntity(row);
  }

  async update(
    id: number,
    data: Partial<CreateStoreData & { status: StoreStatus; logoUrl: string | null }>
  ): Promise<StoreEntity | null> {
    const fields: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name.trim());
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }
    if (data.logoUrl !== undefined) {
      fields.push(`logo_url = $${paramIndex++}`);
      params.push(data.logoUrl);
    }
    if (data.botToken !== undefined) {
      fields.push(`bot_token = $${paramIndex++}`);
      params.push(data.botToken ? data.botToken.trim() : null);
    }
    if (data.botUsername !== undefined) {
      fields.push(`bot_username = $${paramIndex++}`);
      params.push(data.botUsername);
    }
    if (data.webappUrl !== undefined) {
      fields.push(`webapp_url = $${paramIndex++}`);
      params.push(data.webappUrl);
    }
    if (data.deliveryEnabled !== undefined) {
      fields.push(`delivery_enabled = $${paramIndex++}`);
      params.push(data.deliveryEnabled);
    }
    if (data.deliveryRadiusKm !== undefined) {
      fields.push(`delivery_radius_km = $${paramIndex++}`);
      params.push(data.deliveryRadiusKm);
    }
    if (data.deliveryPrice !== undefined) {
      fields.push(`delivery_price = $${paramIndex++}`);
      params.push(data.deliveryPrice);
    }
    if (data.minOrderAmount !== undefined) {
      fields.push(`min_order_amount = $${paramIndex++}`);
      params.push(data.minOrderAmount);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');

    const res = await query<StoreDbRow>(
      `UPDATE stores
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params
    );

    const row = res.rows[0];
    return row ? mapRowToStoreEntity(row) : null;
  }

  async listAll(limit = 20, offset = 0): Promise<{ stores: StoreEntity[]; total: number }> {
    const countRes = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM stores');
    const total = countRes ? parseInt(countRes.count, 10) : 0;

    const res = await query<StoreDbRow>(
      `SELECT * FROM stores ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      stores: res.rows.map(mapRowToStoreEntity),
      total,
    };
  }
}
