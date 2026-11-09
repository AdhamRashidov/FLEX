import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { logger } from '../logger/index.js';

/**
 * Markaziy xatolik ushlovchi middleware
 * Barcha xatolarni yagona JSON formatida qaytaradi
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    logger.warn('ErrorHandler', `[${err.code}] ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Kutilmagan xatoliklar
  logger.error('ErrorHandler', `Kutilmagan xatolik: ${err.message}`, err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Serverda ichki xatolik yuz berdi',
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}
