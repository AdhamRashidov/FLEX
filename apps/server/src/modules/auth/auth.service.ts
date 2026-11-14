import { config } from '../../config/index.js';
import { validateTelegramInitData } from '../../common/utils/telegram-auth.js';
import { generateToken } from '../../common/utils/jwt.js';
import { queryOne, tx } from '../../infrastructure/database/pool.js';
import { PgUserRepository } from '../../infrastructure/repositories/pg-user.repository.js';
import { PgStoreRepository } from '../../infrastructure/repositories/pg-store.repository.js';
import { UnauthorizedError, NotFoundError, ForbiddenError, ConflictError } from '../../common/errors/index.js';
import { verifyPassword, hashPassword } from '../../common/utils/password.js';
import { UserRole, normalizeUzPhone } from '@flex/shared';
import type { UserDTO, RegisterOwnerInput } from '@flex/shared';

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
      botToken = store.botToken ?? undefined;
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
      isSuperAdmin: role === UserRole.SUPER_ADMIN,
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

  /**
   * Admin / Xodimlar uchun Login (Telefon yoki Username) + Parol orqali kirish
   */
  async loginWithCredentials(
    login: string,
    password: string
  ): Promise<AuthResult & { store?: { id: number; name: string; slug: string } }> {
    const cleanLogin = login.trim();
    const normalizedPhone = normalizeUzPhone(cleanLogin);
    const cleanDigits = cleanLogin.replace(/\D/g, '');

    const user = await queryOne<{
      id: string;
      telegram_id: string | null;
      first_name: string;
      last_name: string | null;
      username: string | null;
      phone: string | null;
      photo_url: string | null;
      password_hash: string | null;
      is_super_admin: boolean;
    }>(
      `SELECT id, telegram_id, first_name, last_name, username, phone, photo_url, password_hash, is_super_admin
       FROM users
       WHERE LOWER(username) = LOWER($1)
          OR (phone IS NOT NULL AND (phone = $1 OR phone = $2 OR phone = $3))
       LIMIT 1`,
      [cleanLogin, normalizedPhone, cleanDigits ? `+${cleanDigits}` : cleanLogin]
    );

    if (!user || !user.password_hash) {
      throw new UnauthorizedError('Telefon/login yoki parol noto\'g\'ri');
    }

    // 2. Parolni tekshirish (bcrypt compare)
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Telefon/login yoki parol noto\'g\'ri');
    }

    const userId = Number(user.id);
    const telegramId = user.telegram_id ? Number(user.telegram_id) : 0;

    // 3. Rolni aniqlash
    let role: UserRole = UserRole.CUSTOMER;
    let storeInfo: { id: number; name: string; slug: string } | undefined;

    if (user.is_super_admin || config.superAdminIds.includes(telegramId)) {
      role = UserRole.SUPER_ADMIN;
    }

    // Do'kon egasi ekanligini tekshirish
    const ownedStore = await queryOne<{ id: string; name: string; slug: string }>(
      'SELECT id, name, slug FROM stores WHERE owner_id = $1 LIMIT 1',
      [userId]
    );

    if (ownedStore) {
      if (role !== UserRole.SUPER_ADMIN) role = UserRole.OWNER;
      storeInfo = { id: Number(ownedStore.id), name: ownedStore.name, slug: ownedStore.slug };
    } else {
      // Xodim ekanligini tekshirish
      const staffMember = await queryOne<{
        role: string;
        store_id: string;
        store_name: string;
        store_slug: string;
      }>(
        `SELECT sm.role, sm.store_id, s.name as store_name, s.slug as store_slug
         FROM staff_members sm
         JOIN stores s ON s.id = sm.store_id
         WHERE sm.user_id = $1 AND sm.is_active = true
         LIMIT 1`,
        [userId]
      );
      if (staffMember) {
        if (role !== UserRole.SUPER_ADMIN) {
          role = staffMember.role === 'owner' ? UserRole.OWNER : UserRole.CASHIER;
        }
        storeInfo = {
          id: Number(staffMember.store_id),
          name: staffMember.store_name,
          slug: staffMember.store_slug,
        };
      }
    }

    // Mijoz bo'lsa (do'kon egasi yoki xodim bo'lmasa) admin panelga kirish taqiqlanadi
    if (role === UserRole.CUSTOMER) {
      throw new ForbiddenError('Ushbu hisob do\'kon admin paneliga kirish huquqiga ega emas');
    }

    // 4. JWT yaratish
    const token = generateToken({
      userId,
      telegramId,
      role,
      isSuperAdmin: role === UserRole.SUPER_ADMIN,
      firstName: user.first_name,
      username: user.username,
    });

    return {
      token,
      user: {
        id: userId,
        telegramId,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url,
        role,
      },
      store: storeInfo,
    };
  }

  /**
   * Yangi do'kon egasi ro'yxatdan o'tishi (Register Owner & Store)
   */
  async registerOwner(
    input: RegisterOwnerInput
  ): Promise<AuthResult & { store: { id: number; name: string; slug: string } }> {
    const cleanPhone = normalizeUzPhone(input.phone);
    const cleanUsername = input.username.toLowerCase().trim();

    // 1. Telefon yoki username band emasligini tekshirish
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM users
       WHERE LOWER(username) = LOWER($1)
          OR (phone IS NOT NULL AND phone = $2)
       LIMIT 1`,
      [cleanUsername, cleanPhone]
    );

    if (existing) {
      throw new ConflictError("Ushbu telefon raqami yoki username allaqachon ro'yxatdan o'tgan");
    }

    // 2. Slug yaratish va unikal qilish
    const slugify = (text: string) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

    let baseSlug = input.storeSlug ? slugify(input.storeSlug) : slugify(input.storeName);
    if (!baseSlug || baseSlug.length < 2) {
      baseSlug = `store-${Date.now().toString().slice(-4)}`;
    }

    let finalSlug = baseSlug;
    let counter = 1;
    while (await this.storeRepo.findBySlug(finalSlug)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    // 3. Parolni bcrypt bilan xavfsiz heshlash
    const passwordHash = await hashPassword(input.password);

    // 4. Tranzaksiya bilan foydalanuvchi, do'kon va staff_member yaratish
    const result = await tx(async (client) => {
      // 4a. User yaratish
      const userRes = await client.query<{ id: string }>(
        `INSERT INTO users (
           first_name, last_name, username, phone, password_hash, is_super_admin, language_code
         )
         VALUES ($1, $2, $3, $4, $5, false, 'uz')
         RETURNING id`,
        [
          input.firstName.trim(),
          input.lastName?.trim() ?? null,
          cleanUsername,
          cleanPhone,
          passwordHash,
        ]
      );
      const userRow = userRes.rows[0];
      if (!userRow) throw new Error("Foydalanuvchi yaratib bo'lmadi");
      const userId = Number(userRow.id);

      // 4b. Store yaratish
      const storeRes = await client.query<{ id: string; name: string; slug: string }>(
        `INSERT INTO stores (
           owner_id, name, slug, phone, status, delivery_enabled
         )
         VALUES ($1, $2, $3, $4, 'active', true)
         RETURNING id, name, slug`,
        [userId, input.storeName.trim(), finalSlug, cleanPhone]
      );
      const storeRow = storeRes.rows[0];
      if (!storeRow) throw new Error("Do'kon yaratib bo'lmadi");
      const storeId = Number(storeRow.id);

      // 4c. Staff member (owner) biriktirish
      await client.query(
        `INSERT INTO staff_members (store_id, user_id, role, is_active)
         VALUES ($1, $2, 'owner', true)`,
        [storeId, userId]
      );

      return {
        userId,
        store: { id: storeId, name: storeRow.name, slug: storeRow.slug },
      };
    });

    // 5. JWT token generatsiya qilish
    const token = generateToken({
      userId: result.userId,
      role: UserRole.OWNER,
      isSuperAdmin: false,
      firstName: input.firstName.trim(),
      username: cleanUsername,
    });

    return {
      token,
      user: {
        id: result.userId,
        telegramId: 0,
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() ?? null,
        username: cleanUsername,
        photoUrl: null,
        role: UserRole.OWNER,
      },
      store: result.store,
    };
  }
}

