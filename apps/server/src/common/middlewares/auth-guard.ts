import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../errors/index.js';

/**
 * Autentifikatsiyani talab qiluvchi Guard (JWT Bearer Token)
 * Muvaffaqiyatli bo'lsa req.user ga foydalanuvchi ma'lumotlarini yuklaydi
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Avtorizatsiya tokeni berilmagan');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Token topilmadi');
  }

  const payload = verifyToken(token);

  req.user = {
    id: payload.userId || payload.sub,
    telegramId: payload.telegramId ?? 0,
    role: payload.role,
    firstName: payload.username ?? 'User',
    username: payload.username ?? null,
    isSuperAdmin: payload.isSuperAdmin ?? (payload.role === 'super_admin'),
  };

  next();
}

/**
 * Ixtiyoriy Autentifikatsiya (Token bo'lsa req.user ga yozadi, bo'lmasa o'tkazib yuboradi)
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const payload = verifyToken(token);
        req.user = {
          id: payload.userId || payload.sub,
          telegramId: payload.telegramId ?? 0,
          role: payload.role,
          firstName: payload.username ?? 'User',
          username: payload.username ?? null,
          isSuperAdmin: payload.isSuperAdmin ?? (payload.role === 'super_admin'),
        };
      } catch {
        // Token xato bo'lsa ham mehmon sifatida o'tkaziladi
      }
    }
  }

  next();
}
