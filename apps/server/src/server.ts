import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './common/logger/index.js';
import { errorHandler, requestTracer } from './common/middlewares/index.js';
import { pool } from './infrastructure/database/pool.js';

const app = express();

// ── Asosiy Middleware'lar ──────────────────────
app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestTracer);

// ── Health Check ──────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(503).json({ success: false, error: { code: 'DB_UNREACHABLE', message: 'Database ulanishi mavjud emas' } });
  }
});

// TODO: Modullar route'lari shu yerga ulanadi
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/admin/stores', adminStoreRoutes);
// app.use('/api/v1/store', storeRoutes);
// app.use('/api/v1/shop', shopRoutes);

// ── 404 Handler ───────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'So\'ralgan endpoint topilmadi' },
  });
});

// ── Global Error Handler ──────────────────────
app.use(errorHandler);

// ── Server Ishga Tushirish ────────────────────
const server = app.listen(config.port, () => {
  logger.info('Server', `🚀 FLEX API ishga tushdi: http://localhost:${config.port}`);
  logger.info('Server', `📊 Health check: http://localhost:${config.port}/api/health`);
  logger.info('Server', `🌍 Muhit: ${config.env}`);
});

// ── Graceful Shutdown ─────────────────────────
const shutdown = async (signal: string) => {
  logger.info('Server', `${signal} signali qabul qilindi. Server xavfsiz to'xtatilmoqda...`);
  server.close(async () => {
    await pool.end();
    logger.info('Server', 'PostgreSQL pool yopildi. Server to\'xtatildi.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Crash Guards ──────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Process', `Kutilmagan Rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error('Process', `Kutilmagan Exception: ${err.message}`, err);
  process.exit(1);
});

export { app };
