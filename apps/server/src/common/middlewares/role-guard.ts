import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import { UserRole } from '@flex/shared';

/**
 * Role-Based Access Control (RBAC) Guard
 * Foydalanuvchi ko'rsatilgan rollardan biriga ega ekanligini tekshiradi.
 * 
 * 👑 Big Boss (SUPER_ADMIN) uchun hech qanday cheklov yo'q — barcha rollarni chetlab o'tadi.
 *
 * @param allowedRoles Ruxsat berilgan rollar ro'yxati
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Avval tizimga kiring');
    }

    // Super Admin (Big Boss) hech qanday cheklovlarsiz hamma joyga kirishi mumkin
    if (req.user.role === UserRole.SUPER_ADMIN || req.user.isSuperAdmin) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Ushbu amalni bajarish uchun sizda yetarli ruxsat yo\'q');
    }

    next();
  };
}
