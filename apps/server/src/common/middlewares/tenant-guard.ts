import type { Request, Response, NextFunction } from 'express';
import { queryOne } from '../../infrastructure/database/pool.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors/index.js';
import type { StoreDTO } from '@flex/shared';

interface StoreRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  status: string;
  delivery_enabled: boolean;
  delivery_radius_km: number;
  delivery_price: number;
  min_order_amount: number;
  payment_card_number: string | null;
  created_at: Date;
}

/**
 * Multi-tenant izolyatsiya Guard'i
 * So'rov kelgan do'konni (tenant) aniqlaydi va uning faolligini tekshiradi
 * Aniqlangan do'kon ma'lumotlarini `req.storeId` va `req.store` ga yuklaydi
 *
 * Qidiruv tartibi:
 * 1. URL params: `:storeSlug` yoki `:storeId`
 * 2. Headers: `X-Store-Id` yoki `X-Store-Slug`
 */
export async function resolveTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const rawSlug = req.params.storeSlug || req.headers['x-store-slug'];
  const storeSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const rawId = req.params.storeId || req.headers['x-store-id'];
  const storeIdParam = Array.isArray(rawId) ? rawId[0] : rawId;

  let row: StoreRow | null = null;

  if (storeSlug) {
    row = await queryOne<StoreRow>(
      `SELECT id, name, slug, description, logo_url, phone, status,
              delivery_enabled, delivery_radius_km, delivery_price, min_order_amount,
              payment_card_number, created_at
       FROM stores
       WHERE slug = $1`,
      [storeSlug.toLowerCase().trim()]
    );
  } else if (storeIdParam) {
    const storeIdNum = parseInt(storeIdParam, 10);
    if (isNaN(storeIdNum)) {
      throw new ValidationError('Yaroqsiz store ID formati');
    }

    row = await queryOne<StoreRow>(
      `SELECT id, name, slug, description, logo_url, phone, status,
              delivery_enabled, delivery_radius_km, delivery_price, min_order_amount,
              payment_card_number, created_at
       FROM stores
       WHERE id = $1`,
      [storeIdNum]
    );
  } else {
    throw new ValidationError('Do\'kon identifikatori (storeSlug yoki storeId) ko\'rsatilmadi');
  }

  if (!row) {
    throw new NotFoundError('Do\'kon');
  }

  if (row.status === 'suspended' || row.status === 'inactive') {
    throw new ForbiddenError('Ushbu do\'kon faoliyati to\'xtatilgan');
  }

  const storeDto: StoreDTO = {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    phone: row.phone,
    status: row.status as StoreDTO['status'],
    deliveryEnabled: row.delivery_enabled,
    deliveryRadiusKm: Number(row.delivery_radius_km),
    deliveryPrice: Number(row.delivery_price),
    minOrderAmount: Number(row.min_order_amount),
    paymentCardNumber: row.payment_card_number,
    createdAt: row.created_at.toISOString(),
  };

  req.storeId = storeDto.id;
  req.store = storeDto;

  next();
}
