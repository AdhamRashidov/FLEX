import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index.js';
import { UnauthorizedError } from '../errors/index.js';
import type { UserRole } from '@flex/shared';

export interface TokenPayload {
  sub: number;                   // RFC 7519 Subject (User ID)
  userId: number;                // Moslik uchun
  telegramId?: number | null;
  role: UserRole;
  isSuperAdmin?: boolean;
  username?: string | null;
  sid: string;                   // Session UUID
}

export interface CreateTokenInput {
  userId: number;
  telegramId?: number | null;
  role: UserRole;
  isSuperAdmin?: boolean;
  username?: string | null;
  firstName?: string;
}

/**
 * JWT token generatsiya qilish
 * Xavfsiz, minimal claims (faqat identifikatorlar, hech qanday parol yoki maxfiy ma'lumotlar saqlanmaydi)
 */
export function generateToken(input: CreateTokenInput): string {
  const payload: TokenPayload = {
    sub: input.userId,
    userId: input.userId,
    telegramId: input.telegramId ?? null,
    role: input.role,
    isSuperAdmin: input.isSuperAdmin ?? (input.role === 'super_admin'),
    username: input.username ?? null,
    sid: uuidv4(),
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * JWT tokenni tekshirish va payloadni qaytarish
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as unknown as TokenPayload;
    return decoded;
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token muddati tugagan. Qaytadan kiring');
    }
    throw new UnauthorizedError('Yaroqsiz token');
  }
}
