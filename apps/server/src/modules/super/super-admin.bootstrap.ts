import { config } from '../../config/index.js';
import { logger } from '../../common/logger/index.js';
import { queryOne, query } from '../../infrastructure/database/pool.js';
import { hashPassword } from '../../common/utils/password.js';

interface SuperAdminRow {
  id: string;
  username: string | null;
  phone: string | null;
  is_super_admin: boolean;
  password_hash: string | null;
}

/**
 * Super Admin Bootstrap (Express startup / onModuleInit)
 * Loyiha run bo'lganida DB ni tekshiradi:
 * 1. Agar SUPER_ADMIN bo'lsa — indamaydi (faolligini tasdiqlaydi).
 * 2. Agar SUPER_ADMIN bo'lmasa — .env dagi ma'lumotlar asosida yangi SUPER_ADMIN yaratadi.
 */
export async function bootstrapSuperAdmin(): Promise<void> {
  const { username, password, phone } = config.superAdmin;

  if (!username || !password) {
    logger.warn('SuperAdminBootstrap', '⚠️ .env faylida SUPERADMIN ma\'lumotlari to\'liq emas.');
    return;
  }

  try {
    // 1. DB da SUPER_ADMIN bor-yo'qligini tekshiramiz
    const existing = await queryOne<SuperAdminRow>(
      `SELECT id, username, phone, is_super_admin, password_hash
       FROM users
       WHERE is_super_admin = true
          OR LOWER(username) = LOWER($1)
          OR (phone IS NOT NULL AND phone = $2)
       ORDER BY is_super_admin DESC, id ASC
       LIMIT 1`,
      [username, phone]
    );

    if (!existing) {
      // DB da super admin yo'q — .env ma'lumotlari bilan yangi yaratamiz
      const hashedPassword = await hashPassword(password);
      const created = await queryOne<SuperAdminRow>(
        `INSERT INTO users (
           first_name,
           last_name,
           username,
           phone,
           password_hash,
           is_super_admin,
           language_code
         )
         VALUES ('Adham', 'Rashidov', $1, $2, $3, true, 'uz')
         RETURNING id, username, phone, is_super_admin`,
        [username, phone, hashedPassword]
      );

      logger.info(
        'SuperAdminBootstrap',
        `👑 [SUPER_ADMIN YARATILDI] ID: #${created?.id} | Username: @${username} | Tel: ${phone} (Big Boss huquqi berildi)`
      );
      return;
    }

    // Agar mavjud bo'lsa:
    if (!existing.is_super_admin || !existing.password_hash) {
      // Foydalanuvchi bor, lekin superadmin emas yoki paroli yo'q — faollashtiramiz
      const hashedPassword = await hashPassword(password);
      await query(
        `UPDATE users
         SET is_super_admin = true,
             username = COALESCE($1, username),
             phone = COALESCE($2, phone),
             password_hash = COALESCE(password_hash, $3),
             updated_at = NOW()
         WHERE id = $4`,
        [username, phone, hashedPassword, existing.id]
      );
      logger.info(
        'SuperAdminBootstrap',
        `👑 [SUPER_ADMIN FAOL QILINDI] ID: #${existing.id} | @${username} ga Super Admin huquqi berildi`
      );
    } else {
      // Super admin allaqachon mavjud va faol — indamaymiz
      logger.info(
        'SuperAdminBootstrap',
        `👑 [SUPER_ADMIN MAVJUD] ID: #${existing.id} | @${existing.username || username} — tizimga kirishga tayyor`
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Noma\'lum xatolik';
    logger.error('SuperAdminBootstrap', `❌ Super Admin tekshirishda xatolik: ${message}`);
  }
}
