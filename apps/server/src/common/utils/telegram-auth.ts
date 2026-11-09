import crypto from 'crypto';
import { UnauthorizedError } from '../errors/index.js';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface ValidatedInitData {
  user: TelegramUserData;
  authDate: number;
  queryId?: string;
  startParam?: string;
}

/**
 * Telegram Mini App initData ma'lumotlarini HMAC-SHA256 orqali tekshirish
 * Rasmiy Telegram WebApp xavfsizlik standarti:
 * secret_key = HMAC_SHA256("WebAppData", bot_token)
 * hash = HMAC_SHA256(secret_key, data_check_string)
 *
 * @param initData Telegram tomonidan yuborilgan xom initData stringi
 * @param botToken Do'kon botining tokeni
 * @param maxAgeSeconds Tokenning maksimal amal qilish vaqti (default: 86400s = 24 soat)
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): ValidatedInitData {
  if (!initData) {
    throw new UnauthorizedError('Telegram initData ma\'lumotlari berilmagan');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new UnauthorizedError('initData ichida hash topilmadi');
  }

  // Hash parametrini olib tashlaymiz va qolganlarini alifbo tartibida saralaymiz
  params.delete('hash');
  const sortedKeys = Array.from(params.keys()).sort();
  const dataCheckString = sortedKeys.map((key) => `${key}=${params.get(key)}`).join('\n');

  // Telegram standarti bo'yicha secret_key hisoblash
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Hisoblangan hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Xavfsiz taqqoslash (Timing attack'dan himoya)
  const isHashValid =
    hash.length === calculatedHash.length &&
    crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculatedHash, 'hex'));

  if (!isHashValid) {
    throw new UnauthorizedError('Telegram ma\'lumotlari haqiqiy emas (Hash mos kelmadi)');
  }

  // auth_date tekshiruvi (Replay attack oldini olish)
  const authDateStr = params.get('auth_date');
  if (!authDateStr) {
    throw new UnauthorizedError('auth_date ko\'rsatilmagan');
  }

  const authDate = parseInt(authDateStr, 10);
  const currentTime = Math.floor(Date.now() / 1000);

  if (currentTime - authDate > maxAgeSeconds) {
    throw new UnauthorizedError('Telegram sessiyasi eskirgan. Ilovani qaytadan oching');
  }

  // User ma'lumotlarini JSON dan parse qilish
  const userJson = params.get('user');
  if (!userJson) {
    throw new UnauthorizedError('initData ichida user ma\'lumoti topilmadi');
  }

  let user: TelegramUserData;
  try {
    user = JSON.parse(userJson) as TelegramUserData;
  } catch {
    throw new UnauthorizedError('User JSON ma\'lumotini o\'qishda xatolik');
  }

  return {
    user,
    authDate,
    queryId: params.get('query_id') ?? undefined,
    startParam: params.get('start_param') ?? undefined,
  };
}
