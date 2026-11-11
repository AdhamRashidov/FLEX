import { config } from '../../config/index.js';
import { validateTelegramInitData } from '../../common/utils/telegram-auth.js';
import { generateToken } from '../../common/utils/jwt.js';
import { queryOne } from '../../infrastructure/database/pool.js';
import { PgUserRepository } from '../../infrastructure/repositories/pg-user.repository.js';
import { PgStoreRepository } from '../../infrastructure/repositories/pg-store.repository.js';
import { UnauthorizedError, NotFoundError } from '../../common/errors/index.js';
import { UserRole } from '@flex/shared';
import type { UserDTO } from '@flex/shared';

export interface AuthResult {
  token: string;
  user: UserDTO & { role: UserRole };
}

export class AuthService {
  private userRepo: PgUserRepository;
  private storeRepo: PgStoreRepository;

  constructor() {
    this.userRepo = new PgUserRepository();
    this.storeRepo = new PgStoreRepository();
  }

  /**
   * Telegram Mini App initData orqali avtorizatsiya
   */
  async loginWithTelegram(initData: string, storeSlug?: string): Promise<AuthResult> {
    let botToken = config.telegram.botToken;

    // Agar do'kon slug berilgan bo'lsa, ushbu do'konning bot tokenidan foydalanamiz
    if (storeSlug) {
      const store = await this.storeRepo.findBySlug(storeSlug);
      if (!store) {
        throw new NotFoundError(`Do'kon (${storeSlug})`);
      }
      botToken = store.botToken;
    }

    if (!botToken) {
      throw new UnauthorizedError('Tizimda bot tokeni sozlanmagan');
    }

    // 1. Telegram ma'lumotlarini HMAC-SHA256 orqali tekshirish
    const validated = validateTelegramInitData(initData, botToken);
    const tgUser = validated.user;

    // 2. Foydalanuvchini bazada yaratish yoki yangilash (Upsert)
    const userEntity = await this.userRepo.upsertByTelegramId({
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name ?? null,
      username: tgUser.username ?? null,
      languageCode: tgUser.language_code ?? 'uz',
      photoUrl: tgUser.photo_url ?? null,
      isPremium: tgUser.is_premium ?? false,
    });

    // 3. Foydalanuvchining rolini aniqlash (Super Admin, Owner, Staff yoki Customer)
    let role: UserRole = UserRole.CUSTOMER;

    // Super Admin tekshiruvi (Bazada flag yoki config dagi Telegram ID lar)
    const userDb = await queryOne<{ is_super_admin: boolean }>(
      'SELECT is_super_admin FROM users WHERE id = $1',
      [userEntity.id]
    );

    if (userDb?.is_super_admin || config.superAdminIds.includes(userEntity.telegramId)) {
      role = UserRole.SUPER_ADMIN;
    } else {
      // Do'kon egasi ekanligini tekshirish
      const ownedStore = await queryOne<{ id: string }>(
        'SELECT id FROM stores WHERE owner_id = $1 LIMIT 1',
        [userEntity.id]
      );

      if (ownedStore) {
        role = UserRole.OWNER;
      } else {
        // Xodim ekanligini tekshirish
        const staffMember = await queryOne<{ role: string }>(
          'SELECT role FROM staff_members WHERE user_id = $1 AND is_active = true LIMIT 1',
          [userEntity.id]
        );
        if (staffMember) {
          role = staffMember.role === 'owner' ? UserRole.OWNER : UserRole.CASHIER;
        }
      }
    }

    // 4. JWT token yaratish
    const token = generateToken({
      userId: userEntity.id,
      telegramId: userEntity.telegramId,
      role,
      firstName: userEntity.firstName,
      username: userEntity.username,
    });

    return {
      token,
      user: {
        id: userEntity.id,
        telegramId: userEntity.telegramId,
        firstName: userEntity.firstName,
        lastName: userEntity.lastName ?? null,
        username: userEntity.username ?? null,
        photoUrl: userEntity.photoUrl ?? null,
        role,
      },
    };
  }

  /**
   * Joriy foydalanuvchi ma'lumotlarini olish
   */
  async getCurrentUser(userId: number, role: UserRole): Promise<UserDTO & { role: UserRole }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('Foydalanuvchi');
    }

    return {
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName ?? null,
      username: user.username ?? null,
      photoUrl: user.photoUrl ?? null,
      role,
    };
  }
}
