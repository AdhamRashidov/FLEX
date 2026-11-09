import { Redis } from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../common/logger/index.js';

class RedisClientManager {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    if (config.redis.enabled) {
      this.initClient();
    } else {
      logger.info('Redis', 'ℹ️ Redis hozircha o\'chirilgan (REDIS_ENABLED=false). So\'rovlar to\'g\'ridan-to\'g\'ri bazaga yo\'naltiriladi.');
    }
  }

  private initClient(): void {
    try {
      this.client = new Redis(config.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy(times: number) {
          if (times > 3) {
            logger.warn('Redis', '⚠️ Redis bilan aloqa uzildi. Keshsiz ishlashga o\'tildi.');
            return null; // Qayta urinishni to'xtatish
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis', '⚡ Redis bilan aloqa muvaffaqiyatli o\'rnatildi!');
      });

      this.client.on('error', (err: Error) => {
        this.isConnected = false;
        logger.warn('Redis', `⚠️ Redis xatoligi: ${err.message}. Kesh vaqtincha nofaol.`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Ulanishni sinash (xatolik bo'lsa server qulamaydi)
      this.client.connect().catch((err: Error) => {
        this.isConnected = false;
        logger.warn('Redis', `⚠️ Redis ulanib bo'lmadi (${err.message}). Tizim xotirjam keshsiz ishlayveradi.`);
      });
    } catch (err: unknown) {
      this.isConnected = false;
      const msg = err instanceof Error ? err.message : 'Noma\'lum';
      logger.warn('Redis', `⚠️ Redis initsializatsiya xatosi: ${msg}`);
    }
  }

  public getRawClient(): Redis | null {
    return this.isConnected ? this.client : null;
  }

  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export const redisManager = new RedisClientManager();

/**
 * Xalqaro Best Practice bo'yicha Kesh Xizmati (Cache Service)
 * Agar Redis o'chiq bo'lsa yoki aloqa uzilsa, hech qachon xatolik otmaydi —
 * avtomatik ravishda to'g'ridan-to'g'ri bazadan ma'lumotni olib qaytaradi (Graceful Degradation).
 */
export const cacheService = {
  /**
   * Keshdan qiymat olish
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redisManager.isReady()) return null;

    try {
      const data = await redisManager.getRawClient()?.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  /**
   * Keshga qiymat yozish (ixtiyoriy TTL - yashash vaqti bilan)
   */
  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!redisManager.isReady()) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redisManager.getRawClient()?.setex(key, ttlSeconds, serialized);
      } else {
        await redisManager.getRawClient()?.set(key, serialized);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      logger.warn('Cache', `Keshga yozishda xatolik: ${msg}`);
    }
  },

  /**
   * Keshdan kalitni o'chirish
   */
  async del(key: string | string[]): Promise<void> {
    if (!redisManager.isReady()) return;

    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length > 0) {
        await redisManager.getRawClient()?.del(...keys);
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Pattern bo'yicha barcha kesh kalitlarini tozalash (masalan: `store:1:products:*`)
   */
  async delPattern(pattern: string): Promise<void> {
    if (!redisManager.isReady()) return;

    try {
      const client = redisManager.getRawClient();
      if (!client) return;

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Get-Or-Set (Keshda bo'lsa keshdan oladi, bo'lmasa bazadan olib keshga yozadi)
   * Bu pattern xalqaro e-commerce standartida eng ko'p qo'llaniladi.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  },
};
