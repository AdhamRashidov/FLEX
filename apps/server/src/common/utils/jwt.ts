import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { UnauthorizedError } from '../errors/index.js';
import type { UserRole } from '@flex/shared';

export interface TokenPayload {
  userId: number;
  telegramId: number;
  role: UserRole;
  firstName: string;
  username?: string | null;
}

/**
 * JWT token generatsiya qilish
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * JWT tokenni tekshirish va payloadni qaytarish
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded;
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token muddati tugagan. Qaytadan kiring');
    }
    throw new UnauthorizedError('Yaroqsiz token');
  }
}
