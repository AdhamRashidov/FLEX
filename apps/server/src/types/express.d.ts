export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      storeId?: number;
      user?: {
        id: number;
        telegramId: number;
        role: string;
      };
    }
  }
}
