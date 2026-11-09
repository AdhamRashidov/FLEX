import { query, queryOne } from '../../infrastructure/database/pool.js';
import type { IUserRepository, CreateUserData } from '../../core/repositories/user.repository.interface.js';
import type { UserEntity } from '../../core/entities/user.entity.js';

interface UserDbRow {
  id: string;
  telegram_id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string;
  photo_url: string | null;
  is_bot: boolean;
  is_premium: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRowToEntity(row: UserDbRow): UserEntity {
  return {
    id: Number(row.id),
    telegramId: Number(row.telegram_id),
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    languageCode: row.language_code,
    photoUrl: row.photo_url,
    isBot: row.is_bot,
    isPremium: row.is_premium,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgUserRepository implements IUserRepository {
  async findById(id: number): Promise<UserEntity | null> {
    const row = await queryOne<UserDbRow>(
      `SELECT id, telegram_id, first_name, last_name, username, language_code,
              photo_url, is_bot, is_premium, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return row ? mapRowToEntity(row) : null;
  }

  async findByTelegramId(telegramId: number): Promise<UserEntity | null> {
    const row = await queryOne<UserDbRow>(
      `SELECT id, telegram_id, first_name, last_name, username, language_code,
              photo_url, is_bot, is_premium, created_at, updated_at
       FROM users
       WHERE telegram_id = $1`,
      [telegramId]
    );
    return row ? mapRowToEntity(row) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const res = await query<UserDbRow>(
      `INSERT INTO users (
        telegram_id, first_name, last_name, username, language_code,
        photo_url, is_bot, is_premium
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, telegram_id, first_name, last_name, username, language_code,
                photo_url, is_bot, is_premium, created_at, updated_at`,
      [
        data.telegramId,
        data.firstName,
        data.lastName ?? null,
        data.username ?? null,
        data.languageCode ?? 'uz',
        data.photoUrl ?? null,
        data.isBot ?? false,
        data.isPremium ?? false,
      ]
    );

    const row = res.rows[0];
    if (!row) throw new Error('Foydalanuvchi yaratib bo\'lmadi');
    return mapRowToEntity(row);
  }

  /**
   * Telegram initData orqali kirganda foydalanuvchini avtomatik qo'shish yoki yangilash (Upsert)
   */
  async upsertByTelegramId(data: CreateUserData): Promise<UserEntity> {
    const res = await query<UserDbRow>(
      `INSERT INTO users (
        telegram_id, first_name, last_name, username, language_code,
        photo_url, is_bot, is_premium, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (telegram_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
        language_code = COALESCE(EXCLUDED.language_code, users.language_code),
        is_premium = EXCLUDED.is_premium,
        updated_at = NOW()
      RETURNING id, telegram_id, first_name, last_name, username, language_code,
                photo_url, is_bot, is_premium, created_at, updated_at`,
      [
        data.telegramId,
        data.firstName,
        data.lastName ?? null,
        data.username ?? null,
        data.languageCode ?? 'uz',
        data.photoUrl ?? null,
        data.isBot ?? false,
        data.isPremium ?? false,
      ]
    );

    const row = res.rows[0];
    if (!row) throw new Error('Foydalanuvchi upsert qilib bo\'lmadi');
    return mapRowToEntity(row);
  }

  async update(id: number, data: Partial<CreateUserData>): Promise<UserEntity | null> {
    const fields: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (data.firstName !== undefined) {
      fields.push(`first_name = $${paramIndex++}`);
      params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      fields.push(`last_name = $${paramIndex++}`);
      params.push(data.lastName);
    }
    if (data.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      params.push(data.username);
    }
    if (data.photoUrl !== undefined) {
      fields.push(`photo_url = $${paramIndex++}`);
      params.push(data.photoUrl);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');

    const res = await query<UserDbRow>(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING id, telegram_id, first_name, last_name, username, language_code,
                 photo_url, is_bot, is_premium, created_at, updated_at`,
      params
    );

    const row = res.rows[0];
    return row ? mapRowToEntity(row) : null;
  }
}
