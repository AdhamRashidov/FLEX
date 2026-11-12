import type { StoreDTO, UserRole } from '@flex/shared';

export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      storeId?: number;
      store?: StoreDTO;
      user?: {
        id: number;
        telegramId: number;
        role: UserRole;
        firstName: string;
        username?: string | null;
        isSuperAdmin?: boolean;
      };
    }
  }
}
