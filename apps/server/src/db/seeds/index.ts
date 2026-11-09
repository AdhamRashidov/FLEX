import { pool, query, queryOne } from '../../infrastructure/database/pool.js';
import { logger } from '../../common/logger/index.js';

async function seed() {
  logger.info('Seed', '🌱 Boshlang\'ich ma\'lumotlar kiritilmoqda...');

  try {
    // 1. Demo User (Do'kon egasi)
    let owner = await queryOne<{ id: number }>(
      'SELECT id FROM users WHERE telegram_id = $1',
      [123456789]
    );

    if (!owner) {
      const res = await query<{ id: number }>(`
        INSERT INTO users (telegram_id, first_name, last_name, username, language_code)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [123456789, 'Alisher', 'Navoiy', 'alisher_demo', 'uz']);
      owner = res.rows[0] ?? null;
      logger.info('Seed', `👤 Demo foydalanuvchi yaratildi: ID ${owner?.id}`);
    }

    if (!owner) throw new Error('Owner yaratib bo\'lmadi');

    // 2. Demo Store (Hosil Market)
    let store = await queryOne<{ id: number }>(
      'SELECT id FROM stores WHERE slug = $1',
      ['hosil-market']
    );

    if (!store) {
      const res = await query<{ id: number }>(`
        INSERT INTO stores (
          owner_id, name, slug, description, phone, bot_token, bot_username,
          delivery_enabled, delivery_price, min_order_amount, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        owner.id,
        'Hosil Market',
        'hosil-market',
        'Sifatli va hamyonbop oziq-ovqat mahsulotlari',
        '+998901234567',
        'demo_bot_token_hosil',
        'hosil_market_demo_bot',
        true,
        5000,
        20000,
        'active'
      ]);
      store = res.rows[0] ?? null;
      logger.info('Seed', `🏪 Demo do'kon yaratildi: Hosil Market (ID: ${store?.id})`);
    }

    if (!store) throw new Error('Store yaratib bo\'lmadi');

    // 3. Demo Kategoriyalar
    const categories = [
      { name: 'Ichimliklar', slug: 'ichimliklar', emoji: '🥤', sort_order: 1 },
      { name: 'Sut va qatiq', slug: 'sut-va-qatiq', emoji: '🥛', sort_order: 2 },
      { name: 'Non va pishiriqlar', slug: 'non-va-pishiriqlar', emoji: '🍞', sort_order: 3 },
      { name: 'Meva va sabzavotlar', slug: 'meva-va-sabzavotlar', emoji: '🍎', sort_order: 4 },
    ];

    const categoryMap = new Map<string, number>();

    for (const cat of categories) {
      let existing = await queryOne<{ id: number }>(
        'SELECT id FROM categories WHERE store_id = $1 AND slug = $2',
        [store.id, cat.slug]
      );
      if (!existing) {
        const res = await query<{ id: number }>(`
          INSERT INTO categories (store_id, name, slug, emoji, sort_order)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [store.id, cat.name, cat.slug, cat.emoji, cat.sort_order]);
        existing = res.rows[0] ?? null;
      }
      if (existing) {
        categoryMap.set(cat.slug, existing.id);
      }
    }
    logger.info('Seed', '📂 Demo kategoriyalar kiritildi');

    // 4. Demo Mahsulotlar
    const products = [
      {
        name: 'Coca-Cola 1.5L',
        price: 14000,
        old_price: 15000,
        category: 'ichimliklar',
        barcode: '5449000000996',
        stock: 50,
        unit: 'dona',
      },
      {
        name: 'Chortoq 0.5L Gazlangan suv',
        price: 6000,
        old_price: null,
        category: 'ichimliklar',
        barcode: '4780005420015',
        stock: 120,
        unit: 'dona',
      },
      {
        name: 'Nestle Sut 3.2% 1L',
        price: 18000,
        old_price: 20000,
        category: 'sut-va-qatiq',
        barcode: '7613035889988',
        stock: 35,
        unit: 'dona',
      },
      {
        name: 'Samarqand noni',
        price: 8000,
        old_price: null,
        category: 'non-va-pishiriqlar',
        barcode: null,
        stock: 20,
        unit: 'dona',
      },
    ];

    for (const prod of products) {
      const catId = prod.category ? categoryMap.get(prod.category) ?? null : null;
      const existing = await queryOne<{ id: number }>(
        'SELECT id FROM products WHERE store_id = $1 AND name = $2',
        [store.id, prod.name]
      );
      if (!existing) {
        await query(`
          INSERT INTO products (
            store_id, category_id, name, price, old_price, barcode, stock_quantity, unit, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        `, [
          store.id,
          catId,
          prod.name,
          prod.price,
          prod.old_price,
          prod.barcode,
          prod.stock,
          prod.unit,
        ]);
      }
    }
    logger.info('Seed', '🛒 Demo mahsulotlar kiritildi');

    // 5. Global Katalog shablonlari
    const globalItems = [
      { name: 'Coca-Cola 1.5L', barcode: '5449000000996', category: 'Ichimliklar', brand: 'Coca-Cola' },
      { name: 'Fanta 1.5L', barcode: '5449000011527', category: 'Ichimliklar', brand: 'Coca-Cola' },
      { name: 'Sprite 1.5L', barcode: '5449000012203', category: 'Ichimliklar', brand: 'Coca-Cola' },
      { name: 'Nestle Sut 3.2% 1L', barcode: '7613035889988', category: 'Sut mahsulotlari', brand: 'Nestle' },
      { name: 'Makfa Oliy navli un 2kg', barcode: '4601424000305', category: 'Un va yormalar', brand: 'Makfa' },
    ];

    for (const item of globalItems) {
      const existing = await queryOne<{ id: number }>(
        'SELECT id FROM global_catalog WHERE barcode = $1',
        [item.barcode]
      );
      if (!existing) {
        await query(`
          INSERT INTO global_catalog (name, barcode, category, brand, unit)
          VALUES ($1, $2, $3, $4, 'dona')
        `, [item.name, item.barcode, item.category, item.brand]);
      }
    }
    logger.info('Seed', '🌐 Global katalog shablonlari kiritildi');

    logger.info('Seed', '✅ Barcha ma\'lumotlar muvaffaqiyatli kiritildi!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Noma\'lum xatolik';
    logger.error('Seed', `Xatolik: ${msg}`, err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
