import { query, queryOne, tx } from '../database/pool.js';
import type { IProductRepository, ProductFilter } from '../../core/repositories/product.repository.interface.js';
import type { ProductEntity, ProductImageEntity } from '../../core/entities/product.entity.js';
import type { CreateProductInput, ProductUnit } from '@flex/shared';

interface ProductDbRow {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  price: number;
  old_price: number | null;
  cost_price: number | null;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  track_stock: boolean;
  attributes: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  total_count?: string;
}

interface ProductImageDbRow {
  id: string;
  product_id: string;
  store_id: string;
  url: string;
  tg_file_id: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: Date;
}

function mapRowToProduct(row: ProductDbRow, images: ProductImageEntity[] = []): ProductEntity {
  return {
    id: Number(row.id),
    storeId: Number(row.store_id),
    categoryId: row.category_id ? Number(row.category_id) : null,
    name: row.name,
    description: row.description,
    barcode: row.barcode,
    sku: row.sku,
    price: row.price,
    oldPrice: row.old_price,
    costPrice: row.cost_price,
    unit: row.unit as ProductUnit,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    trackStock: row.track_stock,
    attributes: row.attributes ?? {},
    isActive: row.is_active,
    sortOrder: row.sort_order,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToImage(row: ProductImageDbRow): ProductImageEntity {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    storeId: Number(row.store_id),
    url: row.url,
    tgFileId: row.tg_file_id,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

export class PgProductRepository implements IProductRepository {
  async findById(storeId: number, id: number): Promise<ProductEntity | null> {
    const row = await queryOne<ProductDbRow>(
      `SELECT * FROM products WHERE store_id = $1 AND id = $2`,
      [storeId, id]
    );

    if (!row) return null;

    const imgRes = await query<ProductImageDbRow>(
      `SELECT * FROM product_images WHERE store_id = $1 AND product_id = $2 ORDER BY sort_order ASC, id ASC`,
      [storeId, id]
    );

    return mapRowToProduct(row, imgRes.rows.map(mapRowToImage));
  }

  async findByBarcode(storeId: number, barcode: string): Promise<ProductEntity | null> {
    const row = await queryOne<ProductDbRow>(
      `SELECT * FROM products WHERE store_id = $1 AND barcode = $2`,
      [storeId, barcode.trim()]
    );

    if (!row) return null;

    const imgRes = await query<ProductImageDbRow>(
      `SELECT * FROM product_images WHERE store_id = $1 AND product_id = $2 ORDER BY sort_order ASC, id ASC`,
      [storeId, row.id]
    );

    return mapRowToProduct(row, imgRes.rows.map(mapRowToImage));
  }

  async findMany(
    storeId: number,
    filter: ProductFilter = {}
  ): Promise<{ products: ProductEntity[]; total: number }> {
    const conditions: string[] = ['p.store_id = $1'];
    const params: unknown[] = [storeId];
    let paramIndex = 2;

    if (filter.categoryId !== undefined) {
      conditions.push(`p.category_id = $${paramIndex++}`);
      params.push(filter.categoryId);
    }

    if (filter.isActive !== undefined) {
      conditions.push(`p.is_active = $${paramIndex++}`);
      params.push(filter.isActive);
    }

    if (filter.inStockOnly) {
      conditions.push(`(p.track_stock = false OR p.stock_quantity > 0)`);
    }

    if (filter.minPrice !== undefined) {
      conditions.push(`p.price >= $${paramIndex++}`);
      params.push(filter.minPrice);
    }

    if (filter.maxPrice !== undefined) {
      conditions.push(`p.price <= $${paramIndex++}`);
      params.push(filter.maxPrice);
    }

    if (filter.search && filter.search.trim() !== '') {
      const searchTerm = filter.search.trim();
      conditions.push(
        `(p.search_vector @@ plainto_tsquery('simple', $${paramIndex}) OR p.name ILIKE $${paramIndex + 1} OR p.barcode = $${paramIndex})`
      );
      params.push(searchTerm, `%${searchTerm}%`);
      paramIndex += 2;
    }

    const limit = filter.limit ?? 20;
    const offset = filter.offset ?? 0;

    const whereClause = conditions.join(' AND ');

    // COUNT(*) OVER() orqali bitta so'rovda umumiy soni va sahifalangan tovarlarni olamiz
    const sql = `
      SELECT p.*, COUNT(*) OVER() as total_count
      FROM products p
      WHERE ${whereClause}
      ORDER BY p.sort_order ASC, p.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const res = await query<ProductDbRow>(sql, params);
    if (res.rows.length === 0) {
      return { products: [], total: 0 };
    }

    const total = parseInt(res.rows[0]?.total_count ?? '0', 10);
    const productIds = res.rows.map((r) => Number(r.id));

    // Barcha tovarlarning rasmlarini bitta so'rovda tortib olamiz (N+1 query muammosini oldini olish)
    const imgRes = await query<ProductImageDbRow>(
      `SELECT * FROM product_images WHERE store_id = $1 AND product_id = ANY($2::bigint[]) ORDER BY sort_order ASC, id ASC`,
      [storeId, productIds]
    );

    const imagesByProduct = new Map<number, ProductImageEntity[]>();
    for (const imgRow of imgRes.rows) {
      const pId = Number(imgRow.product_id);
      const list = imagesByProduct.get(pId) ?? [];
      list.push(mapRowToImage(imgRow));
      imagesByProduct.set(pId, list);
    }

    const products = res.rows.map((row) =>
      mapRowToProduct(row, imagesByProduct.get(Number(row.id)) ?? [])
    );

    return { products, total };
  }

  async create(storeId: number, data: CreateProductInput): Promise<ProductEntity> {
    const res = await query<ProductDbRow>(
      `INSERT INTO products (
        store_id, category_id, name, description, barcode, sku, price, old_price, cost_price,
        unit, stock_quantity, low_stock_threshold, track_stock, is_active, search_vector
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        to_tsvector('simple', $3 || ' ' || COALESCE($4, ''))
      )
      RETURNING *`,
      [
        storeId,
        data.categoryId ?? null,
        data.name.trim(),
        data.description ?? null,
        data.barcode ?? null,
        data.sku ?? null,
        data.price,
        data.oldPrice ?? null,
        data.costPrice ?? null,
        data.unit,
        data.stockQuantity,
        data.lowStockThreshold,
        data.trackStock,
        data.isActive,
      ]
    );

    const row = res.rows[0];
    if (!row) throw new Error('Mahsulot yaratib bo\'lmadi');
    return mapRowToProduct(row);
  }

  async update(
    storeId: number,
    id: number,
    data: Partial<CreateProductInput>
  ): Promise<ProductEntity | null> {
    const fields: string[] = [];
    const params: unknown[] = [storeId, id];
    let paramIndex = 3;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name.trim());
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.categoryId !== undefined) {
      fields.push(`category_id = $${paramIndex++}`);
      params.push(data.categoryId);
    }
    if (data.barcode !== undefined) {
      fields.push(`barcode = $${paramIndex++}`);
      params.push(data.barcode);
    }
    if (data.sku !== undefined) {
      fields.push(`sku = $${paramIndex++}`);
      params.push(data.sku);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${paramIndex++}`);
      params.push(data.price);
    }
    if (data.oldPrice !== undefined) {
      fields.push(`old_price = $${paramIndex++}`);
      params.push(data.oldPrice);
    }
    if (data.costPrice !== undefined) {
      fields.push(`cost_price = $${paramIndex++}`);
      params.push(data.costPrice);
    }
    if (data.unit !== undefined) {
      fields.push(`unit = $${paramIndex++}`);
      params.push(data.unit);
    }
    if (data.stockQuantity !== undefined) {
      fields.push(`stock_quantity = $${paramIndex++}`);
      params.push(data.stockQuantity);
    }
    if (data.lowStockThreshold !== undefined) {
      fields.push(`low_stock_threshold = $${paramIndex++}`);
      params.push(data.lowStockThreshold);
    }
    if (data.trackStock !== undefined) {
      fields.push(`track_stock = $${paramIndex++}`);
      params.push(data.trackStock);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }

    if (data.name !== undefined || data.description !== undefined) {
      fields.push(
        `search_vector = to_tsvector('simple', COALESCE($3, name) || ' ' || COALESCE(description, ''))`
      );
    }

    if (fields.length === 0) {
      return this.findById(storeId, id);
    }

    fields.push('updated_at = NOW()');

    const res = await query<ProductDbRow>(
      `UPDATE products
       SET ${fields.join(', ')}
       WHERE store_id = $1 AND id = $2
       RETURNING *`,
      params
    );

    const row = res.rows[0];
    return row ? this.findById(storeId, id) : null;
  }

  async delete(storeId: number, id: number): Promise<boolean> {
    const res = await query(
      `DELETE FROM products WHERE store_id = $1 AND id = $2`,
      [storeId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async updateStock(storeId: number, id: number, quantityChange: number): Promise<number> {
    const res = await queryOne<{ stock_quantity: number }>(
      `UPDATE products
       SET stock_quantity = GREATEST(0, stock_quantity + $1), updated_at = NOW()
       WHERE store_id = $2 AND id = $3
       RETURNING stock_quantity`,
      [quantityChange, storeId, id]
    );
    return res ? res.stock_quantity : 0;
  }

  async addImages(
    storeId: number,
    productId: number,
    images: { url: string; isPrimary: boolean }[]
  ): Promise<ProductImageEntity[]> {
    if (images.length === 0) return [];

    return tx(async (client) => {
      const createdImages: ProductImageEntity[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img) continue;

        if (img.isPrimary) {
          // Avvalgi asosiy rasmni oddiy rasmga o'zgartirish
          await client.query(
            `UPDATE product_images SET is_primary = false WHERE store_id = $1 AND product_id = $2`,
            [storeId, productId]
          );
        }

        const res = await client.query<ProductImageDbRow>(
          `INSERT INTO product_images (product_id, store_id, url, sort_order, is_primary)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [productId, storeId, img.url, i, img.isPrimary]
        );

        if (res.rows[0]) {
          createdImages.push(mapRowToImage(res.rows[0]));
        }
      }

      return createdImages;
    });
  }

  async deleteImage(storeId: number, imageId: number): Promise<boolean> {
    const res = await query(
      `DELETE FROM product_images WHERE store_id = $1 AND id = $2`,
      [storeId, imageId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
