import { pool, query, queryOne } from '../../infrastructure/database/pool.js';
import { logger } from '../../common/logger/index.js';
import { hashPassword } from '../../common/utils/password.js';


async function seed() {
  logger.info('Seed', '🌱 Boshlang\'ich ma\'lumotlar kiritilmoqda...');

  try {
    // 1. Demo User (Do'kon egasi)
    const demoPasswordHash = hashPassword('admin123');
    let owner = await queryOne<{ id: number }>(
      'SELECT id FROM users WHERE telegram_id = $1 OR username = $2',
      [123456789, 'hosil_admin']
    );

    if (!owner) {
      const res = await query<{ id: number }>(`
        INSERT INTO users (telegram_id, first_name, last_name, username, phone, password_hash, language_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [123456789, 'Alisher', 'Navoiy', 'hosil_admin', '+998901234567', demoPasswordHash, 'uz']);
      owner = res.rows[0] ?? null;
      logger.info('Seed', `👤 Demo foydalanuvchi yaratildi: ID ${owner?.id} (login: hosil_admin, parol: admin123)`);
    } else {
      // Parol va telefonni yangilash
      await query(`
        UPDATE users
        SET username = 'hosil_admin',
            phone = '+998901234567',
            password_hash = $1
        WHERE id = $2
      `, [demoPasswordHash, owner.id]);

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
    } else {
      // Mavjud bo'lsa POS API kalitini yangilash
      await query(
        `UPDATE stores
         SET pos_api_key = COALESCE(pos_api_key, 'flex_pos_demo_hosil_market_secret_123')
         WHERE id = $1`,
        [store.id]
      );
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
      { name: 'Coca-Cola 1.5L', barcode: '5449000000996', category: 'Ichimliklar', brand: 'Coca-Cola', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500' },
      { name: 'Fanta 1.5L', barcode: '5449000011527', category: 'Ichimliklar', brand: 'Coca-Cola', imageUrl: 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=500' },
      { name: 'Sprite 1.5L', barcode: '5449000012203', category: 'Ichimliklar', brand: 'Coca-Cola', imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500' },
      { name: 'Nestle Sut 3.2% 1L', barcode: '7613035889988', category: 'Sut mahsulotlari', brand: 'Nestle', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500' },
      { name: 'Makfa Oliy navli un 2kg', barcode: '4601424000305', category: 'Un va yormalar', brand: 'Makfa', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500' },
      { name: 'Chortoq 0.5L Gazlangan suv', barcode: '4780005420015', category: 'Ichimliklar', brand: 'Chortoq', imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500' },
      { name: 'Hot Lunch Mol go\'shti 70g', barcode: '4607001000012', category: 'Tez tayyorlanadigan taomlar', brand: 'Hot Lunch', imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500' },
      { name: 'Hot Lunch Tovuq go\'shti 90g', barcode: '4607001000029', category: 'Tez tayyorlanadigan taomlar', brand: 'Hot Lunch', imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500' },
    ];

    for (const item of globalItems) {
      const existing = await queryOne<{ id: number }>(
        'SELECT id FROM global_catalog WHERE barcode = $1',
        [item.barcode]
      );
      if (!existing) {
        await query(`
          INSERT INTO global_catalog (name, barcode, category, brand, image_url, unit)
          VALUES ($1, $2, $3, $4, $5, 'dona')
        `, [item.name, item.barcode, item.category, item.brand, item.imageUrl]);
      } else {
        await query(`
          UPDATE global_catalog
          SET image_url = $1
          WHERE barcode = $2 AND (image_url IS NULL OR image_url = '')
        `, [item.imageUrl, item.barcode]);
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
