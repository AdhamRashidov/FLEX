import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. users — Global Telegram foydalanuvchilari
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id              BIGSERIAL PRIMARY KEY,
      telegram_id     BIGINT NOT NULL UNIQUE,
      first_name      VARCHAR(255) NOT NULL,
      last_name       VARCHAR(255),
      username        VARCHAR(255),
      language_code   VARCHAR(10) DEFAULT 'uz',
      photo_url       TEXT,
      is_bot          BOOLEAN DEFAULT FALSE,
      is_premium      BOOLEAN DEFAULT FALSE,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
  `);

  // 2. stores — Do'konlar (Tenantlar)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS stores (
      id                  BIGSERIAL PRIMARY KEY,
      owner_id            BIGINT NOT NULL REFERENCES users(id),
      name                VARCHAR(255) NOT NULL,
      slug                VARCHAR(100) NOT NULL UNIQUE,
      description         TEXT,
      logo_url            TEXT,
      phone               VARCHAR(20),
      bot_token           VARCHAR(255) NOT NULL UNIQUE,
      bot_username        VARCHAR(255),
      webapp_url          TEXT,
      working_hours       JSONB DEFAULT '{"mon":{"open":"08:00","close":"22:00"}}'::jsonb,
      delivery_enabled    BOOLEAN DEFAULT TRUE,
      delivery_radius_km  DECIMAL(5,2) DEFAULT 5.00,
      delivery_price      INTEGER DEFAULT 0,
      min_order_amount    INTEGER DEFAULT 0,
      latitude            DECIMAL(10,7),
      longitude           DECIMAL(10,7),
      status              VARCHAR(20) DEFAULT 'active' 
                          CHECK (status IN ('active', 'inactive', 'suspended', 'maintenance')),
      payment_card_number VARCHAR(20),
      payment_card_holder VARCHAR(255),
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
    CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
    CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
  `);

  // 3. staff_members — Do'kon xodimlari
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS staff_members (
      id          BIGSERIAL PRIMARY KEY,
      store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id     BIGINT NOT NULL REFERENCES users(id),
      role        VARCHAR(20) NOT NULL DEFAULT 'cashier'
                  CHECK (role IN ('owner', 'manager', 'cashier')),
      is_active   BOOLEAN DEFAULT TRUE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_staff_store ON staff_members(store_id);
  `);

  // 4. categories — Mahsulot kategoriyalari
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS categories (
      id          BIGSERIAL PRIMARY KEY,
      store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      parent_id   BIGINT REFERENCES categories(id) ON DELETE SET NULL,
      name        VARCHAR(255) NOT NULL,
      slug        VARCHAR(255) NOT NULL,
      emoji       VARCHAR(10),
      image_url   TEXT,
      sort_order  INTEGER DEFAULT 0,
      is_active   BOOLEAN DEFAULT TRUE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  `);

  // 5. products — Mahsulotlar katalogi
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS products (
      id                  BIGSERIAL PRIMARY KEY,
      store_id            BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      category_id         BIGINT REFERENCES categories(id) ON DELETE SET NULL,
      name                VARCHAR(500) NOT NULL,
      description         TEXT,
      barcode             VARCHAR(50),
      sku                 VARCHAR(100),
      price               INTEGER NOT NULL,
      old_price           INTEGER,
      cost_price          INTEGER,
      unit                VARCHAR(20) DEFAULT 'dona'
                          CHECK (unit IN ('dona', 'kg', 'litr', 'metr', 'pachka', 'quti', 'juft')),
      stock_quantity      INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      track_stock         BOOLEAN DEFAULT TRUE,
      attributes          JSONB DEFAULT '{}'::jsonb,
      is_active           BOOLEAN DEFAULT TRUE,
      sort_order          INTEGER DEFAULT 0,
      search_vector       TSVECTOR,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(store_id, barcode);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(store_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(store_id, price);
  `);

  // 6. product_images — Mahsulot rasmlari
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS product_images (
      id          BIGSERIAL PRIMARY KEY,
      product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      url         TEXT NOT NULL,
      tg_file_id  VARCHAR(255),
      sort_order  INTEGER DEFAULT 0,
      is_primary  BOOLEAN DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
  `);

  // 7. customers — Do'kon mijozlari
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS customers (
      id            BIGSERIAL PRIMARY KEY,
      store_id      BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id       BIGINT NOT NULL REFERENCES users(id),
      phone         VARCHAR(20),
      notes         TEXT,
      total_orders  INTEGER DEFAULT 0,
      total_spent   BIGINT DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
    CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
  `);

  // 8. customer_addresses — Mijoz manzillari
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id          BIGSERIAL PRIMARY KEY,
      customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      label       VARCHAR(50) DEFAULT 'Uy',
      address     TEXT NOT NULL,
      latitude    DECIMAL(10,7),
      longitude   DECIMAL(10,7),
      is_default  BOOLEAN DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id);
  `);

  // 9. carts — Savat
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS carts (
      id          BIGSERIAL PRIMARY KEY,
      store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, customer_id)
    );
  `);

  // 10. cart_items — Savat tarkibi
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id          BIGSERIAL PRIMARY KEY,
      cart_id     BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      added_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(cart_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
  `);

  // 11. orders — Buyurtmalar
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS orders (
      id                  BIGSERIAL PRIMARY KEY,
      store_id            BIGINT NOT NULL REFERENCES stores(id),
      customer_id         BIGINT NOT NULL REFERENCES customers(id),
      order_number        INTEGER NOT NULL,
      status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',
                            'confirmed',
                            'preparing',
                            'delivering',
                            'delivered',
                            'cancelled'
                          )),
      subtotal            INTEGER NOT NULL,
      delivery_fee        INTEGER DEFAULT 0,
      discount            INTEGER DEFAULT 0,
      total               INTEGER NOT NULL,
      payment_method      VARCHAR(20) NOT NULL DEFAULT 'cash'
                          CHECK (payment_method IN ('cash', 'card_transfer')),
      payment_status      VARCHAR(20) DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
      payment_proof_url   TEXT,
      delivery_type       VARCHAR(20) DEFAULT 'delivery'
                          CHECK (delivery_type IN ('delivery', 'pickup')),
      delivery_address    TEXT,
      delivery_lat        DECIMAL(10,7),
      delivery_lng        DECIMAL(10,7),
      customer_note       TEXT,
      cancel_reason       TEXT,
      cancelled_by        VARCHAR(20) CHECK (cancelled_by IN ('customer', 'store')),
      confirmed_at        TIMESTAMPTZ,
      delivered_at        TIMESTAMPTZ,
      cancelled_at        TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, order_number)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(store_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(store_id, created_at DESC);
  `);

  // 12. order_items — Buyurtma elementlari (tarixiy narxlar bilan)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS order_items (
      id            BIGSERIAL PRIMARY KEY,
      order_id      BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id    BIGINT NOT NULL REFERENCES products(id),
      store_id      BIGINT NOT NULL REFERENCES stores(id),
      product_name  VARCHAR(500) NOT NULL,
      product_price INTEGER NOT NULL,
      quantity      INTEGER NOT NULL,
      total         INTEGER NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `);

  // 13. transactions — Moliya va hisob-kitob
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          BIGSERIAL PRIMARY KEY,
      store_id    BIGINT NOT NULL REFERENCES stores(id),
      order_id    BIGINT REFERENCES orders(id),
      type        VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
      category    VARCHAR(50) NOT NULL,
      amount      INTEGER NOT NULL,
      description TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(store_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(store_id, type);
  `);

  // 14. global_catalog — Umumiy mahsulotlar shabloni
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS global_catalog (
      id          BIGSERIAL PRIMARY KEY,
      name        VARCHAR(500) NOT NULL,
      barcode     VARCHAR(50) UNIQUE,
      category    VARCHAR(255),
      image_url   TEXT,
      unit        VARCHAR(20) DEFAULT 'dona',
      brand       VARCHAR(255),
      description TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_global_catalog_barcode ON global_catalog(barcode);
  `);

  // 15. import_jobs — Ommaviy import vazifalari
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS import_jobs (
      id              BIGSERIAL PRIMARY KEY,
      store_id        BIGINT NOT NULL REFERENCES stores(id),
      source          VARCHAR(20) NOT NULL CHECK (source IN ('excel', 'telegram', 'global_catalog', 'pos')),
      status          VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      total_items     INTEGER DEFAULT 0,
      imported_items  INTEGER DEFAULT 0,
      failed_items    INTEGER DEFAULT 0,
      error_log       JSONB DEFAULT '[]'::jsonb,
      file_url        TEXT,
      source_channel  VARCHAR(255),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      completed_at    TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_import_jobs_store ON import_jobs(store_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS import_jobs CASCADE;
    DROP TABLE IF EXISTS global_catalog CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS cart_items CASCADE;
    DROP TABLE IF EXISTS carts CASCADE;
    DROP TABLE IF EXISTS customer_addresses CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS product_images CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS staff_members CASCADE;
    DROP TABLE IF EXISTS stores CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
}
