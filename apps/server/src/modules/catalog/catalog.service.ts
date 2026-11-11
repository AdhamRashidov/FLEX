import { query, queryOne, tx } from '../../infrastructure/database/pool.js';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import { cacheService } from '../../infrastructure/cache/redis.js';
import type { ProductUnit } from '@flex/shared';

export interface GlobalCatalogItem {
  id: number;
  name: string;
  barcode: string | null;
  category: string | null;
  imageUrl: string | null;
  unit: string;
  brand: string | null;
  description: string | null;
  createdAt: Date;
}

interface CatalogDbRow {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  image_url: string | null;
  unit: string;
  brand: string | null;
  description: string | null;
  created_at: Date;
}

function mapRow(row: CatalogDbRow): GlobalCatalogItem {
  return {
    id: Number(row.id),
    name: row.name,
    barcode: row.barcode,
    category: row.category,
    imageUrl: row.image_url,
    unit: row.unit,
    brand: row.brand,
    description: row.description,
    createdAt: row.created_at,
  };
}

export class CatalogService {
  /**
   * Shtrix-kod bo'yicha Global Katalogdan tovar qidirish (Skaner va Smart Suggestion uchun)
   */
  async findByBarcode(barcode: string): Promise<GlobalCatalogItem | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    const row = await queryOne<CatalogDbRow>(
      'SELECT * FROM global_catalog WHERE barcode = $1 LIMIT 1',
      [cleanBarcode]
    );

    return row ? mapRow(row) : null;
  }

  /**
   * Global Katalogdan to'liq matnli qidiruv
   */
  async search(queryStr: string, limit = 20): Promise<GlobalCatalogItem[]> {
    const q = queryStr.trim();
    if (!q) return [];

    const { rows } = await query<CatalogDbRow>(
      `SELECT * FROM global_catalog 
       WHERE name ILIKE $1 OR barcode = $2 OR brand ILIKE $1
       ORDER BY id ASC
       LIMIT $3`,
      [`%${q}%`, q, limit]
    );

    return rows.map(mapRow);
  }

  /**
   * Global Katalogdagi shablon tovardan o'z do'koniga mahsulot yaratish (Adoption)
   * 1 ta rasm URLini qayta yuklamasdan to'g'ridan-to'g'ri biriktiradi (DRY)!
   */
  async adoptToStore(
    storeId: number,
    catalogId: number,
    data: {
      price: number;
      stockQuantity?: number;
      categoryId?: number;
    }
  ) {
    const catalogItem = await queryOne<CatalogDbRow>(
      'SELECT * FROM global_catalog WHERE id = $1',
      [catalogId]
    );

    if (!catalogItem) {
      throw new NotFoundError('Global katalog mahsuloti');
    }

    return tx(async (client) => {
      // 1. Ushbu shtrix-kod do'konda allaqachon bormi?
      if (catalogItem.barcode) {
        const existing = await client.query(
          'SELECT id FROM products WHERE store_id = $1 AND barcode = $2',
          [storeId, catalogItem.barcode]
        );
        if (existing.rows.length > 0) {
          throw new ConflictError('Ushbu shtrix-kodli tovar do\'koningizda allaqachon mavjud');
        }
      }

      // 2. Kategoriya aniqlash (agar categoryId berilmagan bo'lsa, mos nomli kategoriya topish yoki yaratish)
      let resolvedCategoryId = data.categoryId ?? null;

      if (!resolvedCategoryId && catalogItem.category) {
        const catRes = await client.query<{ id: string }>(
          'SELECT id FROM categories WHERE store_id = $1 AND name ILIKE $2 LIMIT 1',
          [storeId, catalogItem.category]
        );
        if (catRes.rows.length > 0) {
          resolvedCategoryId = Number(catRes.rows[0]?.id);
        } else {
          // Yangi kategoriya ochamiz
          const slug = catalogItem.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const newCat = await client.query<{ id: string }>(
            `INSERT INTO categories (store_id, name, slug)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [storeId, catalogItem.category, `${slug}-${Date.now().toString().slice(-4)}`]
          );
          resolvedCategoryId = Number(newCat.rows[0]?.id);
        }
      }

      // 3. Yangi mahsulotni kiritish
      const prodRes = await client.query<{ id: string }>(
        `INSERT INTO products (
           store_id, category_id, name, description, barcode, price, unit,
           stock_quantity, track_stock, is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          storeId,
          resolvedCategoryId,
          catalogItem.name,
          catalogItem.description ?? null,
          catalogItem.barcode,
          data.price,
          (catalogItem.unit as ProductUnit) || 'dona',
          data.stockQuantity ?? 0,
          true,
          true,
        ]
      );

      const productId = Number(prodRes.rows[0]?.id);

      // 4. Rasm biriktirish (Global katalogdagi mavjud rasm URLidan nusxa olmasdan foydalanish)
      if (catalogItem.image_url) {
        await client.query(
          `INSERT INTO product_images (product_id, store_id, url, is_primary, sort_order)
           VALUES ($1, $2, $3, true, 0)`,
          [productId, storeId, catalogItem.image_url]
        );
      }

      // 5. Keshni tozalash
      await cacheService.delPattern(`shop:products:${storeId}:*`);

      return {
        id: productId,
        storeId,
        name: catalogItem.name,
        price: data.price,
        barcode: catalogItem.barcode,
        imageUrl: catalogItem.image_url,
      };
    });
  }
}
