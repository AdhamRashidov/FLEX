import type { Request, Response, NextFunction } from 'express';
import { queryOne } from '../../infrastructure/database/pool.js';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';

/**
 * POS tizimlari (1C, kassa) uchun API kalit orqali autentifikatsiya middleware
 */
export async function requirePosAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const headerKey = req.headers['x-pos-api-key'] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  const apiKey = (headerKey || bearerKey || '').trim();

  if (!apiKey) {
    throw new UnauthorizedError('POS API kalit (X-POS-Api-Key yoki Bearer token) taqdim etilmadi');
  }

  const store = await queryOne<{
    id: string;
    name: string;
    slug: string;
    status: string;
    pos_enabled: boolean;
  }>(
    'SELECT id, name, slug, status, pos_enabled FROM stores WHERE pos_api_key = $1 LIMIT 1',
    [apiKey]
  );

  if (!store) {
    throw new UnauthorizedError('Noto\'g\'ri POS API kaliti');
  }

  if (store.status !== 'active') {
    throw new ForbiddenError('Do\'kon faol emas');
  }

  if (!store.pos_enabled) {
    throw new ForbiddenError('Do\'konda POS integratsiyasi vaqtincha to\'xtatilgan');
  }

  req.storeId = Number(store.id);
  (req as unknown as Record<string, unknown>).posStore = store;

  next();
}
