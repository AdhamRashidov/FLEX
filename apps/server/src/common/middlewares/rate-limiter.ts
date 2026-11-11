import type { Request, Response, NextFunction } from 'express';
import { redisManager } from '../../infrastructure/cache/redis.js';
import { RateLimitError } from '../errors/index.js';

export interface RateLimitOptions {
  windowMs: number; // Vaqt oynasi millisekundlarda (masalan: 60_000 = 1 daqiqa)
  max: number;      // Shu vaqt oynasida ruxsat etilgan maksimal so'rovlar soni
  message?: string;
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
}

interface MemoryRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryRecord>();

// Xotirani vaqti-vaqti bilan eski yozuvlardan tozalab turish (har 5 daqiqada)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Xalqaro standartdagi Rate Limiter middleware
 * DDoS, Brute-force va API suiste'moliga qarshi himoya
 * Redis mavjud bo'lsa Redis orqali, bo'lmasa xotira (in-memory) orqali ishlaydi (Graceful Fallback)
 */
export function rateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'So\'rovlar soni me\'yordan oshdi. Iltimos biroz kuting.',
    keyPrefix = 'rl',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : req.socket.remoteAddress;
      return rawIp || '127.0.0.1';
    },

  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientKey = keyGenerator(req);
    const key = `${keyPrefix}:${clientKey}`;
    const now = Date.now();
    const windowSec = Math.ceil(windowMs / 1000);

    let currentCount = 0;
    let resetTime = now + windowMs;

    const redis = redisManager.getRawClient();

    if (redis && redisManager.isReady()) {
      try {
        // Redis sliding / atomic counter
        const redisKey = `ratelimit:${key}`;
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.expire(redisKey, windowSec);
        }
        const ttl = await redis.ttl(redisKey);
        currentCount = count;
        resetTime = now + (ttl > 0 ? ttl * 1000 : windowMs);
      } catch {
        // Fallback to in-memory
        const record = memoryStore.get(key);
        if (!record || record.resetAt <= now) {
          memoryStore.set(key, { count: 1, resetAt: now + windowMs });
          currentCount = 1;
        } else {
          record.count += 1;
          currentCount = record.count;
          resetTime = record.resetAt;
        }
      }
    } else {
      // In-memory store
      const record = memoryStore.get(key);
      if (!record || record.resetAt <= now) {
        memoryStore.set(key, { count: 1, resetAt: now + windowMs });
        currentCount = 1;
      } else {
        record.count += 1;
        currentCount = record.count;
        resetTime = record.resetAt;
      }
    }

    const remaining = Math.max(0, max - currentCount);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (currentCount > max) {
      res.setHeader('Retry-After', Math.ceil((resetTime - now) / 1000));
      return next(new RateLimitError(message));
    }

    next();
  };
}

/** Standart umumiy rate limiter: 1 daqiqada 200 ta so'rov */
export const defaultRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  keyPrefix: 'default',
});

/** Auth va login himoyasi: 1 daqiqada 30 ta so'rov */
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'auth',
  message: 'Avtorizatsiya so\'rovlari chegarasi oshdi. Bir ozdan so\'ng qayta urinib ko\'ring.',
});

/** POS va integratsiya: 1 daqiqada 60 ta so'rov */
export const posRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'pos',
});
