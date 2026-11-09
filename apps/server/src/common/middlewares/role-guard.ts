import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import type { UserRole } from '@flex/shared';

/**
 * Role-Based Access Control (RBAC) Guard
 * Foydalanuvchi ko'rsatilgan rollardan biriga ega ekanligini tekshiradi
 *
 * @param allowedRoles Ruxsat berilgan rollar ro'yxati
 *
 * Misol:
 * router.post('/products', requireAuth, requireRole(UserRole.OWNER, UserRole.MANAGER), createProduct);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Avval tizimga kiring');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Ushbu amalni bajarish uchun sizda yetarli ruxsat yo\'q');
    }

    next();
  };
}
