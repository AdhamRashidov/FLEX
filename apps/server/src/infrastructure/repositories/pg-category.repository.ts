import { query, queryOne, tx } from '../database/pool.js';
import type { ICategoryRepository } from '../../core/repositories/category.repository.interface.js';
import type { CategoryEntity } from '../../core/entities/category.entity.js';
import type { CreateCategoryInput } from '@flex/shared';

interface CategoryDbRow {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRowToCategory(row: CategoryDbRow): CategoryEntity {
  return {
    id: Number(row.id),
    storeId: Number(row.store_id),
    parentId: row.parent_id ? Number(row.parent_id) : null,
    name: row.name,
    slug: row.slug,
    emoji: row.emoji,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgCategoryRepository implements ICategoryRepository {
  async findById(storeId: number, id: number): Promise<CategoryEntity | null> {
    const row = await queryOne<CategoryDbRow>(
      `SELECT * FROM categories WHERE store_id = $1 AND id = $2`,
      [storeId, id]
    );
    return row ? mapRowToCategory(row) : null;
  }

  async findBySlug(storeId: number, slug: string): Promise<CategoryEntity | null> {
    const row = await queryOne<CategoryDbRow>(
      `SELECT * FROM categories WHERE store_id = $1 AND slug = $2`,
      [storeId, slug.toLowerCase().trim()]
    );
    return row ? mapRowToCategory(row) : null;
  }

  async findMany(storeId: number, activeOnly = false): Promise<CategoryEntity[]> {
    const sql = activeOnly
      ? `SELECT * FROM categories WHERE store_id = $1 AND is_active = true ORDER BY sort_order ASC, name ASC`
      : `SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC`;

    const res = await query<CategoryDbRow>(sql, [storeId]);
    return res.rows.map(mapRowToCategory);
  }

  async create(
    storeId: number,
    data: CreateCategoryInput & { slug: string; imageUrl?: string | null }
  ): Promise<CategoryEntity> {
    const res = await query<CategoryDbRow>(
      `INSERT INTO categories (
        store_id, parent_id, name, slug, emoji, image_url, sort_order, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *`,
      [
        storeId,
        data.parentId ?? null,
        data.name.trim(),
        data.slug.toLowerCase().trim(),
        data.emoji ?? null,
        data.imageUrl ?? null,
        data.sortOrder ?? 0,
      ]
    );

    const row = res.rows[0];
    if (!row) throw new Error('Kategoriya yaratib bo\'lmadi');
    return mapRowToCategory(row);
  }

  async update(
    storeId: number,
    id: number,
    data: Partial<CreateCategoryInput & { isActive: boolean }>
  ): Promise<CategoryEntity | null> {
    const fields: string[] = [];
    const params: unknown[] = [storeId, id];
    let paramIndex = 3;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name.trim());
    }
    if (data.emoji !== undefined) {
      fields.push(`emoji = $${paramIndex++}`);
      params.push(data.emoji);
    }
    if (data.parentId !== undefined) {
      fields.push(`parent_id = $${paramIndex++}`);
      params.push(data.parentId);
    }
    if (data.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }

    if (fields.length === 0) {
      return this.findById(storeId, id);
    }

    fields.push('updated_at = NOW()');

    const res = await query<CategoryDbRow>(
      `UPDATE categories
       SET ${fields.join(', ')}
       WHERE store_id = $1 AND id = $2
       RETURNING *`,
      params
    );

    const row = res.rows[0];
    return row ? mapRowToCategory(row) : null;
  }

  async delete(storeId: number, id: number): Promise<boolean> {
    const res = await query(
      `DELETE FROM categories WHERE store_id = $1 AND id = $2`,
      [storeId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async reorder(storeId: number, items: { id: number; sortOrder: number }[]): Promise<void> {
    if (items.length === 0) return;

    await tx(async (client) => {
      for (const item of items) {
        await client.query(
          `UPDATE categories SET sort_order = $1, updated_at = NOW() WHERE store_id = $2 AND id = $3`,
          [item.sortOrder, storeId, item.id]
        );
      }
    });
  }
}
