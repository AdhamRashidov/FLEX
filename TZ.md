# FLEX — Texnik Topshiriq (TZ)
# Flexible Marketplace — Telegram Mini App

> **Versiya:** 1.0
> **Sana:** 2026-11-09
> **Status:** Tasdiqlash kutilmoqda

---

## Mundarija

1. [Loyiha ta'rifi va maqsadi](#1-loyiha-tarifi-va-maqsadi)
2. [Foydalanuvchi rollari](#2-foydalanuvchi-rollari)
3. [Funksional talablar](#3-funksional-talablar)
4. [Ma'lumotlar bazasi sxemasi](#4-malumotlar-bazasi-sxemasi)
5. [API endpointlar](#5-api-endpointlar)
6. [Telegram integratsiyalari](#6-telegram-integratsiyalari)
7. [Tashqi integratsiyalar](#7-tashqi-integratsiyalar)
8. [Frontend sahifalar xaritasi](#8-frontend-sahifalar-xaritasi)
9. [Xavfsizlik](#9-xavfsizlik)
10. [Ishlanish bosqichlari (Roadmap)](#10-ishlanish-bosqichlari-roadmap)

---

## 1. Loyiha ta'rifi va maqsadi

### 1.1 Muammo
Mahalliy do'konlar (oziq-ovqat, kiyim-kechak, xo'jalik mollari) mahsulotlarini
Telegram guruh/kanallarda reklama qiladi. Ammo:
- Xabarlar tezda "ko'milib" ketadi, qidiruv yo'q
- Mahsulot qoldig'i (stock) ko'rinmaydi
- Buyurtmalarni qo'lda yozib olish kerak
- Kirim-chiqim nazorati yo'q
- Mijoz uchun mahsulotlarni filterlab tanlash imkoni yo'q

### 1.2 Yechim
**FLEX** — har bir do'kon uchun o'z nomidagi Telegram botida ishlaydigan
shaxsiy onlayn marketplace (Mini App). Bitta platforma — cheksiz do'konlar.

### 1.3 Biznes modeli
- **White-label Multi-tenant SaaS**
- Har bir do'kon = bitta Telegram bot + unikol Mini App ko'rinishi
- Orqa fonda bitta backend, bitta database (store_id bo'yicha ajratilgan)
- Daromad modeli: oylik obuna (do'kon egalaridan) yoki har bir tranzaksiyadan foiz

### 1.4 MVP maqsadlari
- 3-5 ta do'konni ulash va ishga tushirish
- Har bir do'konda kamida 100-500 ta mahsulot
- Kuniga 20-50 ta buyurtma qayta ishlash
- Nol server xarajati bilan ishlash ($0 infra)

---

## 2. Foydalanuvchi rollari

### 2.1 Super Admin (FLEX platformasi egasi — biz)
- Barcha do'konlarni ko'rish, boshqarish, bloklash
- Yangi do'kon (tenant) yaratish
- Umumiy statistika va monitoring
- Global mahsulotlar katalogini boshqarish

### 2.2 Do'kon egasi (Store Owner)
- O'z do'konining sozlamalarini boshqarish (nomi, logo, ish vaqti, yetkazib berish hududi)
- Mahsulotlar va kategoriyalarni CRUD qilish (birtalab va ommaviy)
- Buyurtmalarni ko'rish, qabul qilish, rad etish
- Kirim-chiqim, moliya hisobotlari
- Xodimlar (kassirlar) qo'shish
- Telegram kanaldan mahsulot import qilish

### 2.3 Xodim / Kassir (Staff)
- Buyurtmalarni ko'rish va statusini o'zgartirish
- Mahsulot qoldig'ini yangilash
- Telegramga tushgan buyurtma bildirishnomalarini ko'rish

### 2.4 Mijoz / Xaridor (Customer)
- Do'konning Mini App'ini ochish (hech qanday ro'yxatdan o'tishsiz)
- Mahsulotlarni ko'rish, qidirish, filterlash (kategoriya, narx)
- Savatga qo'shish, buyurtma berish
- Buyurtma tarixini ko'rish
- Yetkazib berish manzilini belgilash (geolokatsiya)

---

## 3. Funksional talablar

### 3.1 Do'kon (Tenant) boshqaruvi
| ID | Talablar | Prioritet |
|----|----------|-----------|
| S-01 | Super Admin yangi do'kon yaratadi (nomi, bot tokeni, egasi) | P0 |
| S-02 | Do'kon egasi o'z do'konini sozlaydi (logo, rang, ish vaqti) | P0 |
| S-03 | Do'kon egasi yetkazib berish hududini belgilaydi (radius km) | P1 |
| S-04 | Do'kon egasi yetkazib berish narxini belgilaydi | P1 |
| S-05 | Do'kon egasi minimal buyurtma summasini belgilaydi | P2 |
| S-06 | Do'kon vaqtinchalik to'xtatilishi (maintenance mode) | P2 |

### 3.2 Mahsulotlar boshqaruvi
| ID | Talablar | Prioritet |
|----|----------|-----------|
| P-01 | Mahsulot yaratish (nomi, tavsif, narx, rasm, kategoriya, shtrix-kod, birlik, stock) | P0 |
| P-02 | Mahsulotni tahrirlash va o'chirish | P0 |
| P-03 | Ommaviy import (Excel/CSV fayldan) | P0 |
| P-04 | Telegram kanal/guruhdan mahsulot import (AI yordamida) | P1 |
| P-05 | Global katalogdan tanlash (mashhur tovarlar tayyor rasmi va nomi bilan) | P1 |
| P-06 | Shtrix-kod skaner orqali tezkor qo'shish (telefon kamerasi) | P1 |
| P-07 | Mahsulot variantlari (masalan: o'lcham S/M/L, rang) | P2 |
| P-08 | Chegirma/aksiya belgilash (foiz yoki summa) | P2 |
| P-09 | Mahsulot qoldig'i 0 ga tushganda avtomatik "Tugagan" belgisi | P0 |
| P-10 | Stock qoldig'i kam bo'lganda do'kon egasiga ogohlantirish | P1 |

### 3.3 Kategoriyalar
| ID | Talablar | Prioritet |
|----|----------|-----------|
| C-01 | Kategoriya yaratish (nomi, emoji/rasm, tartib raqami) | P0 |
| C-02 | Kategoriyani tahrirlash va o'chirish | P0 |
| C-03 | Ichma-ich kategoriyalar (parent-child) | P2 |

### 3.4 Savat va buyurtma
| ID | Talablar | Prioritet |
|----|----------|-----------|
| O-01 | Savatga mahsulot qo'shish (quantity tanlash) | P0 |
| O-02 | Savatni ko'rish, miqdor o'zgartirish, o'chirish | P0 |
| O-03 | Buyurtma berish (to'lov turi tanlash, manzil, izoh) | P0 |
| O-04 | Buyurtma statuslari: `pending → confirmed → preparing → delivering → delivered / cancelled` | P0 |
| O-05 | Buyurtma berilganda do'kon Telegram guruhiga bildirishnoma | P0 |
| O-06 | Do'kon buyurtmani qabul qilganda/rad etganda mijozga xabar | P0 |
| O-07 | Buyurtma tarixini ko'rish (mijoz) | P1 |
| O-08 | Takroriy buyurtma berish (oldingi buyurtmadagi tovarlarni savatga tushirish) | P2 |

### 3.5 To'lov
| ID | Talablar | Prioritet |
|----|----------|-----------|
| PAY-01 | Naqd to'lov (yetkazib berilganda) | P0 |
| PAY-02 | Karta raqamiga o'tkazish (P2P) + chek rasmi yuklash | P0 |
| PAY-03 | Click / Payme integratsiyasi | P3 (kelajakda) |

### 3.6 Moliya va hisobotlar (Do'kon egasi uchun)
| ID | Talablar | Prioritet |
|----|----------|-----------|
| F-01 | Kunlik / haftalik / oylik sotuvlar hisoboti | P1 |
| F-02 | Eng ko'p sotilgan mahsulotlar TOP-10 | P1 |
| F-03 | Umumiy daromad, o'rtacha chek, buyurtmalar soni | P1 |
| F-04 | Kirim-chiqim qaydnomasi (manual kiritish) | P2 |

### 3.7 POS / Kassa integratsiyasi
| ID | Talablar | Prioritet |
|----|----------|-----------|
| POS-01 | Webhook orqali POS dan sotilgan tovar stock'ni kamaytirish | P1 |
| POS-02 | FLEX Sync Agent (1C uchun lokal dastur) | P2 |
| POS-03 | Online buyurtma tushganda 1C ga bildirishnoma | P3 |

---

## 4. Ma'lumotlar bazasi sxemasi

### 4.1 ER diagramma

```
stores ──────────── store_settings
  │                      
  ├── staff_members      
  ├── categories         
  ├── products ──── product_images
  ├── customers          
  │     └── carts ── cart_items
  │     └── orders ── order_items
  │     └── addresses
  └── transactions (moliya)
  
users (global, Telegram ID bo'yicha)
  └── customer sifatida bir nechta store bilan bog'lanadi
  
global_catalog (umumiy mahsulotlar shabloni)
```

### 4.2 Jadvallar

#### `users` — Global foydalanuvchilar (Telegram ma'lumotlari)
```sql
CREATE TABLE users (
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

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

#### `stores` — Do'konlar (Tenantlar)
```sql
CREATE TABLE stores (
    id              BIGSERIAL PRIMARY KEY,
    owner_id        BIGINT NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE, -- URL uchun: "hosil-market"
    description     TEXT,
    logo_url        TEXT,
    phone           VARCHAR(20),
    
    -- Telegram bot ma'lumotlari
    bot_token       VARCHAR(255) NOT NULL UNIQUE,
    bot_username    VARCHAR(255),
    webapp_url      TEXT, -- Mini App URL manzili
    
    -- Ish vaqti
    working_hours   JSONB DEFAULT '{"mon":{"open":"08:00","close":"22:00"}}'::jsonb,
    
    -- Yetkazib berish
    delivery_enabled    BOOLEAN DEFAULT TRUE,
    delivery_radius_km  DECIMAL(5,2) DEFAULT 5.00,
    delivery_price      INTEGER DEFAULT 0, -- so'mda
    min_order_amount    INTEGER DEFAULT 0,
    latitude            DECIMAL(10,7),
    longitude           DECIMAL(10,7),
    
    -- Holat
    status          VARCHAR(20) DEFAULT 'active' 
                    CHECK (status IN ('active', 'inactive', 'suspended', 'maintenance')),
    
    -- To'lov ma'lumotlari (P2P uchun)
    payment_card_number VARCHAR(20),
    payment_card_holder VARCHAR(255),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_stores_status ON stores(status);
```

#### `staff_members` — Do'kon xodimlari
```sql
CREATE TABLE staff_members (
    id          BIGSERIAL PRIMARY KEY,
    store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    role        VARCHAR(20) NOT NULL DEFAULT 'cashier'
                CHECK (role IN ('owner', 'manager', 'cashier')),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, user_id)
);

CREATE INDEX idx_staff_store ON staff_members(store_id);
```

#### `categories` — Kategoriyalar
```sql
CREATE TABLE categories (
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

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

#### `products` — Mahsulotlar
```sql
CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    store_id        BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id     BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    
    name            VARCHAR(500) NOT NULL,
    description     TEXT,
    barcode         VARCHAR(50),       -- EAN-13, UPC va b.
    sku             VARCHAR(100),      -- Do'konning ichki artikuli
    
    price           INTEGER NOT NULL,  -- so'mda (integer — float xatolaridan himoya)
    old_price       INTEGER,           -- chegirmadan oldingi narx (UI da chizilgan narx)
    cost_price      INTEGER,           -- tannarx (do'kon egasi uchun, mijozga ko'rinmaydi)
    
    unit            VARCHAR(20) DEFAULT 'dona'
                    CHECK (unit IN ('dona', 'kg', 'litr', 'metr', 'pachka', 'quti', 'juft')),
    
    stock_quantity  INTEGER DEFAULT 0,           -- joriy qoldiq
    low_stock_threshold INTEGER DEFAULT 5,       -- qoldiq shu sondan kam bo'lsa ogohlantirish
    track_stock     BOOLEAN DEFAULT TRUE,        -- stock hisobini yuritish (FALSE = cheksiz)
    
    -- Dinamik xususiyatlar (rang, o'lcham, og'irlik va h.k.)
    attributes      JSONB DEFAULT '{}'::jsonb,
    
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    
    -- SEO / qidiruv uchun
    search_vector   TSVECTOR,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(store_id, barcode);
CREATE INDEX idx_products_active ON products(store_id, is_active);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_price ON products(store_id, price);
```

#### `product_images` — Mahsulot rasmlari
```sql
CREATE TABLE product_images (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    tg_file_id  VARCHAR(255),  -- Telegram CDN orqali saqlansa
    sort_order  INTEGER DEFAULT 0,
    is_primary  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
```

#### `customers` — Do'kon mijozlari (user → store bog'lanishi)
```sql
CREATE TABLE customers (
    id          BIGSERIAL PRIMARY KEY,
    store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    phone       VARCHAR(20),
    notes       TEXT,
    total_orders    INTEGER DEFAULT 0,
    total_spent     BIGINT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, user_id)
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_user ON customers(user_id);
```

#### `customer_addresses` — Mijoz manzillari
```sql
CREATE TABLE customer_addresses (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    label       VARCHAR(50) DEFAULT 'Uy',  -- "Uy", "Ish", "Boshqa"
    address     TEXT NOT NULL,
    latitude    DECIMAL(10,7),
    longitude   DECIMAL(10,7),
    is_default  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_customer ON customer_addresses(customer_id);
```

#### `carts` — Savat
```sql
CREATE TABLE carts (
    id          BIGSERIAL PRIMARY KEY,
    store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, customer_id) -- har bir mijozning har do'konda bitta savati
);
```

#### `cart_items` — Savat elementlari
```sql
CREATE TABLE cart_items (
    id          BIGSERIAL PRIMARY KEY,
    cart_id     BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
```

#### `orders` — Buyurtmalar
```sql
CREATE TABLE orders (
    id              BIGSERIAL PRIMARY KEY,
    store_id        BIGINT NOT NULL REFERENCES stores(id),
    customer_id     BIGINT NOT NULL REFERENCES customers(id),
    
    -- Buyurtma raqami (do'kon ichida unikal, ketma-ket)
    order_number    INTEGER NOT NULL,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                        'pending',      -- Yangi, do'kon ko'rmagan
                        'confirmed',    -- Do'kon qabul qildi
                        'preparing',    -- Tayyorlanmoqda
                        'delivering',   -- Yetkazilmoqda
                        'delivered',    -- Yetkazildi
                        'cancelled'     -- Bekor qilindi
                    )),
    
    -- Summalar (so'mda)
    subtotal        INTEGER NOT NULL,   -- mahsulotlar yig'indisi
    delivery_fee    INTEGER DEFAULT 0,
    discount        INTEGER DEFAULT 0,
    total           INTEGER NOT NULL,   -- yakuniy to'lov summasi
    
    -- To'lov
    payment_method  VARCHAR(20) NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'card_transfer')),
    payment_status  VARCHAR(20) DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    payment_proof_url TEXT,             -- karta o'tkazmasi cheki rasmi
    
    -- Yetkazib berish
    delivery_type   VARCHAR(20) DEFAULT 'delivery'
                    CHECK (delivery_type IN ('delivery', 'pickup')),
    delivery_address TEXT,
    delivery_lat    DECIMAL(10,7),
    delivery_lng    DECIMAL(10,7),
    
    -- Qo'shimcha
    customer_note   TEXT,               -- mijoz izohi
    cancel_reason   TEXT,
    cancelled_by    VARCHAR(20) CHECK (cancelled_by IN ('customer', 'store')),
    
    confirmed_at    TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, order_number)
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(store_id, status);
CREATE INDEX idx_orders_created ON orders(store_id, created_at DESC);
```

#### `order_items` — Buyurtma tarkibi
```sql
CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id),
    store_id    BIGINT NOT NULL REFERENCES stores(id),
    
    -- Buyurtma vaqtidagi ma'lumotlarni "muzlatib" saqlaymiz
    product_name    VARCHAR(500) NOT NULL,
    product_price   INTEGER NOT NULL,    -- birlik narxi (buyurtma paytidagi)
    quantity        INTEGER NOT NULL,
    total           INTEGER NOT NULL,    -- price * quantity
    
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

#### `transactions` — Moliyaviy operatsiyalar
```sql
CREATE TABLE transactions (
    id          BIGSERIAL PRIMARY KEY,
    store_id    BIGINT NOT NULL REFERENCES stores(id),
    order_id    BIGINT REFERENCES orders(id),
    
    type        VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category    VARCHAR(50) NOT NULL, -- 'sale', 'delivery', 'refund', 'rent', 'salary', 'other'
    amount      INTEGER NOT NULL,
    description TEXT,
    
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_store ON transactions(store_id);
CREATE INDEX idx_transactions_date ON transactions(store_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(store_id, type);
```

#### `global_catalog` — Umumiy mahsulotlar katalogi (shablon)
```sql
CREATE TABLE global_catalog (
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

CREATE INDEX idx_global_catalog_barcode ON global_catalog(barcode);
CREATE INDEX idx_global_catalog_name ON global_catalog USING GIN(to_tsvector('simple', name));
```

#### `import_jobs` — Mahsulot import holati (Excel, TG kanal)
```sql
CREATE TABLE import_jobs (
    id          BIGSERIAL PRIMARY KEY,
    store_id    BIGINT NOT NULL REFERENCES stores(id),
    source      VARCHAR(20) NOT NULL CHECK (source IN ('excel', 'telegram', 'global_catalog', 'pos')),
    status      VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_items     INTEGER DEFAULT 0,
    imported_items  INTEGER DEFAULT 0,
    failed_items    INTEGER DEFAULT 0,
    error_log       JSONB DEFAULT '[]'::jsonb,
    file_url        TEXT,
    source_channel  VARCHAR(255),   -- TG kanal username
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

#### `media_assets` — Rasmlarni deduplikatsiya qilish va Reference-Count (DRY)
```sql
CREATE TABLE media_assets (
    id              BIGSERIAL PRIMARY KEY,
    url             TEXT NOT NULL UNIQUE,
    file_hash       VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 xesh (kontent bo'yicha yagona)
    storage_path    TEXT NOT NULL,               -- Diskdagi yoki R2 dagi jismoniy fayl yo'li
    file_size       INTEGER NOT NULL,            -- Baytlarda hajmi
    mime_type       VARCHAR(100) NOT NULL,       -- image/webp, image/jpeg va h.k.
    reference_count INTEGER NOT NULL DEFAULT 1,  -- Nechta mahsulot ushbu rasmga bog'langan
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_assets_hash ON media_assets(file_hash);
CREATE INDEX idx_media_assets_url ON media_assets(url);
```

---

## 5. API Endpointlar

### 5.1 Autentifikatsiya
```
POST   /api/v1/auth/telegram          # Telegram InitData bilan tizimga kirish → JWT
POST   /api/v1/auth/refresh           # JWT yangilash
```

### 5.2 Do'konlar (Super Admin)
```
POST   /api/v1/admin/stores           # Yangi do'kon yaratish
GET    /api/v1/admin/stores           # Barcha do'konlar ro'yxati
GET    /api/v1/admin/stores/:id       # Do'kon tafsilotlari
PATCH  /api/v1/admin/stores/:id       # Do'konni tahrirlash
DELETE /api/v1/admin/stores/:id       # Do'konni o'chirish
GET    /api/v1/admin/dashboard        # Umumiy statistika
```

### 5.3 Do'kon sozlamalari (Do'kon egasi)
```
GET    /api/v1/store/profile          # O'z do'koni ma'lumotlari
PATCH  /api/v1/store/profile          # Do'konni tahrirlash
GET    /api/v1/store/dashboard        # Do'kon statistikasi
GET    /api/v1/store/staff            # Xodimlar ro'yxati
POST   /api/v1/store/staff            # Xodim qo'shish
DELETE /api/v1/store/staff/:id        # Xodimni olib tashlash
```

### 5.4 Kategoriyalar
```
GET    /api/v1/store/categories           # Barcha kategoriyalar
POST   /api/v1/store/categories           # Kategoriya yaratish
PATCH  /api/v1/store/categories/:id       # Tahrirlash
DELETE /api/v1/store/categories/:id       # O'chirish
PATCH  /api/v1/store/categories/reorder   # Tartibni o'zgartirish
```

### 5.5 Mahsulotlar (Do'kon admin)
```
GET    /api/v1/store/products                  # Ro'yxat (pagination, filter)
POST   /api/v1/store/products                  # Mahsulot yaratish
GET    /api/v1/store/products/:id              # Tafsilotlar
PATCH  /api/v1/store/products/:id              # Tahrirlash
DELETE /api/v1/store/products/:id              # O'chirish
PATCH  /api/v1/store/products/:id/stock        # Stock yangilash
POST   /api/v1/store/products/import/excel     # Excel import
POST   /api/v1/store/products/import/telegram  # TG kanal import
POST   /api/v1/store/products/import/catalog   # Global katalogdan tanlash
GET    /api/v1/store/products/import/status/:jobId  # Import holati
```

### 5.6 Mahsulotlar (Mijoz — Mini App)
```
GET    /api/v1/shop/:storeSlug/categories      # Do'kon kategoriyalari
GET    /api/v1/shop/:storeSlug/products         # Mahsulotlar (filter, search, pagination)
GET    /api/v1/shop/:storeSlug/products/:id     # Mahsulot tafsilotlari
GET    /api/v1/shop/:storeSlug/info             # Do'kon haqida ma'lumot
```

### 5.7 Savat (Mijoz)
```
GET    /api/v1/shop/:storeSlug/cart             # Savatni ko'rish
POST   /api/v1/shop/:storeSlug/cart/items       # Savatga qo'shish
PATCH  /api/v1/shop/:storeSlug/cart/items/:id   # Miqdor o'zgartirish
DELETE /api/v1/shop/:storeSlug/cart/items/:id   # Savatdan o'chirish
DELETE /api/v1/shop/:storeSlug/cart             # Savatni tozalash
```

### 5.8 Buyurtmalar (Mijoz)
```
POST   /api/v1/shop/:storeSlug/orders           # Buyurtma berish
GET    /api/v1/shop/:storeSlug/orders            # Buyurtmalar tarixi
GET    /api/v1/shop/:storeSlug/orders/:id        # Buyurtma tafsilotlari
POST   /api/v1/shop/:storeSlug/orders/:id/cancel # Bekor qilish
```

### 5.9 Buyurtmalar (Do'kon admin)
```
GET    /api/v1/store/orders                     # Barcha buyurtmalar
GET    /api/v1/store/orders/:id                 # Tafsilotlar
PATCH  /api/v1/store/orders/:id/status          # Status o'zgartirish
```

### 5.10 Moliya (Do'kon admin)
```
GET    /api/v1/store/finance/summary            # Umumiy moliya
GET    /api/v1/store/finance/transactions       # Tranzaksiyalar ro'yxati
POST   /api/v1/store/finance/transactions       # Qo'lda kirim/chiqim qo'shish
GET    /api/v1/store/finance/reports/sales       # Sotuvlar hisoboti
GET    /api/v1/store/finance/reports/top-products # Eng ko'p sotilganlar
```

### 5.11 Integratsiyalar
```
POST   /api/v1/integrations/pos/sale            # POS dan sotilgan tovar xabari
POST   /api/v1/integrations/pos/stock-sync      # Ommaviy stock sinxronizatsiya
POST   /api/v1/webhook/:botToken                # Telegram bot webhook (dinamik)
```

### 5.12 Media
```
POST   /api/v1/media/upload                     # Rasm yuklash
DELETE /api/v1/media/:id                        # Rasm o'chirish
```

---

## 6. Telegram integratsiyalari

### 6.1 Dinamik Multi-Bot Webhook
- Har bir do'kon o'z bot tokenini ro'yxatdan o'tkazadi
- Backend bitta universal endpoint orqali barcha botlarning xabarlarini qabul qiladi:
  `POST /api/v1/webhook/:botToken`
- Webhook handler botToken bo'yicha qaysi do'konniki ekanini aniqlaydi

### 6.2 Mijoz boti (Mini App ochuvchi)
Har bir do'kon boti quyidagi buyruqlarni qo'llab-quvvatlaydi:
- `/start` → Mini App'ni ochish tugmasini ko'rsatadi
- `/help` → Yordam xabari
- Inline rejim: foydalanuvchi do'st bilan mahsulotni ulashishi mumkin

### 6.3 Do'kon xodimlari uchun bildirishnomalar
Yangi buyurtma tushganda do'konning maxsus Telegram guruhiga (yoki egasiga shaxsiy) xabar yuboriladi:
```
🔔 Yangi buyurtma #104!
👤 Ali Valiyev (+998901234567)
📍 Chilonzor 9, 12-uy
🛒 2x Coca-Cola 1.5 — 28,000
   1x Non — 4,000
💵 Jami: 32,000 so'm (Naqd)
🚚 Yetkazib berish: 5,000 so'm
━━━━━━━━━━━━━━━
💰 UMUMIY: 37,000 so'm

[✅ Qabul qilish]  [❌ Rad etish]
```

### 6.4 Telegram InitData autentifikatsiyasi
- Mini App ochilganda Telegram `initData` stringini uzatadi
- Backend HMAC-SHA256 orqali bu ma'lumotni bot token bilan tekshiradi
- Muvaffaqiyatli bo'lsa JWT token beriladi
- Foydalanuvchidan hech qanday parol/telefon so'ralmaydi

---

## 7. Tashqi integratsiyalar

### 7.1 Telegram kanaldan mahsulot import
**Jarayon:**
1. Do'kon egasi admin panelda kanal username/linkini kiritadi
2. Backend (GramJS) kanal postlarini tortib oladi
3. Har bir post matni AI (Gemini Flash) ga yuboriladi
4. AI matndan `{name, price, category}` ajratadi
5. Rasmlar yuklab olinadi
6. Import natijalari ko'rsatiladi (do'kondor tasdiqlaydi/tahrirlaydi)

### 7.2 POS integratsiyasi
**Zamonaviy POS (API bo'lganlar):**
- POS tizim → Webhook → FLEX Backend → `stock_quantity -= sold_qty`

**1C va lokal tizimlar:**
- FLEX Sync Agent (.exe) do'kon kompyuteriga o'rnatiladi
- Agent 1C/lokal baza o'zgarishlarini kuzatadi
- Har 2-5 daqiqada FLEX serverga delta sync yuboradi

### 7.3 AI integratsiyasi (Gemini Flash)
- Telegram post matnidan tovar nomi, narxi ajratish
- Rasmdagi mahsulotni tanib olish (kelajakda)
- Tovar nomlarini normalizatsiya qilish (masalan: "koka kola" → "Coca-Cola 1.5L")

### 7.4 Rasmlar va Katalog Deduplikatsiyasi Qoidalari (Smart Media Architecture)
1. **Shtrix-kod (EAN-13) bo'yicha mustaqillik:**
   - 70gr va 90gr kabi turli o'lchamli tovarlar xalqaro shtrix-kod orqali 100% mustaqil tovar deb tan olinadi va o'zining mos rasmlariga ega bo'ladi.
2. **Gibrid Smart Katalog (Amazon/Uzum modeli):**
   - Do'kondor tovar qo'shayotganda yoki shtrix-kod skanerlaganda tizim Global Katalogdagi tayyor tiniq, studiyaviy rasmni taklif qiladi (Smart Suggestion).
   - Tasdiqlanganda barcha do'konlar shu yagona rasm URLiga qaraydi (serverda ortiqcha 0 bayt disk sarflanadi).
3. **Maxsus do'kon rasmlari (Custom Uploads):**
   - Do'kondor o'z peshtaxtasidagi tovarini o'zi suratga olib yuklasa, bu rasm boshqa do'konlarga majburlanmaydi va aralashtirilmaydi.
   - Agar internetdan bir xil rasm yuklansa, SHA-256 xesh orqali avtomatik deduplikatsiya qilinadi.
4. **Reference-Count va Avto-tozalash (DRY Garbage Collection):**
   - Bitta rasm 1 000 ta mahsulotga ulanishi mumkin (`reference_count = 1000`).
   - Tovar o'chirilganda `reference_count -= 1` qilinadi. Hisoblagich 0 ga tushgandagina jismoniy fayl disk/R2 dan butunlay o'chiriladi.

---

## 8. Frontend sahifalar xaritasi

### 8.1 Mijoz Mini App (Xaridor ko'rinishi)
```
/                           → Bosh sahifa (kategoriyalar + mashhur tovarlar)
/category/:slug             → Kategoriya ichidagi mahsulotlar
/product/:id                → Mahsulot tafsilotlari
/search                     → Qidiruv natijalari
/cart                       → Savat
/checkout                   → Buyurtma rasmiylashtirish
/orders                     → Buyurtmalar tarixi
/orders/:id                 → Buyurtma tafsilotlari
```

### 8.2 Do'kon Admin paneli (Mini App ichida yoki alohida veb)
```
/admin                          → Dashboard (statistika)
/admin/products                 → Mahsulotlar ro'yxati
/admin/products/new             → Yangi mahsulot
/admin/products/:id/edit        → Tahrirlash
/admin/products/import          → Import (Excel, TG, Katalog)
/admin/categories               → Kategoriyalar
/admin/orders                   → Buyurtmalar
/admin/orders/:id               → Buyurtma tafsilotlari
/admin/finance                  → Moliya
/admin/finance/transactions     → Tranzaksiyalar
/admin/settings                 → Do'kon sozlamalari
/admin/staff                    → Xodimlar
/admin/integrations             → POS integratsiyalari
```

### 8.3 Super Admin (Alohida veb panel)
```
/super                          → Umumiy dashboard
/super/stores                   → Do'konlar ro'yxati
/super/stores/:id               → Do'kon tafsilotlari
/super/catalog                  → Global katalog
/super/users                    → Foydalanuvchilar
```

---

## 9. Xavfsizlik

### 9.1 Autentifikatsiya va avtorizatsiya
- Telegram InitData HMAC-SHA256 tekshiruvi (bot token bilan)
- JWT tokenlar (access + refresh)
- Role-based access control (RBAC): super_admin, owner, manager, cashier, customer
- Har bir endpointda role middleware tekshiruvi

### 9.2 Ma'lumotlar himoyasi
- Barcha SQL querylar parametrlashtirilgan (SQL injection himoyasi)
- Multi-tenant izolyatsiya: barcha querylar `store_id` filtriga ega
- Rate limiting (DDoS himoyasi)
- CORS: faqat belgilangan domainlardan
- Input validatsiya: Zod sxemalari orqali
- Bot tokenlar shifrlangan holda saqlanadi

### 9.3 Infratuzilma
- HTTPS (SSL/TLS) — Telegram Mini App talabi
- Environment variables orqali maxfiy kalitlar
- `.env` fayl `.gitignore` da

---

## 10. Ishlanish bosqichlari (Roadmap)

### BOSQICH 0: Poydevor (Foundation) — YAKUNLANDI ✅
> Maqsad: Loyiha skeletini to'g'ri qurish, biror kod yozishdan oldin arxitektura tayyor bo'lishi

- [x] TZ va CLAUDE.md yaratish
- [x] Git repo initsializatsiya, remote GitHub ga ulash (`AdhamRashidov/FLEX.git`)
- [x] Monorepo npm workspaces (`apps/server`, `apps/client`, `apps/admin`, `packages/shared`)
- [x] TypeScript strict mode poydevori (tsconfig.base.json)
- [x] PostgreSQL lokal baza yaratish, ulanish
- [x] Migratsiya tizimini sozlash (`node-pg-migrate`)
- [x] Barcha 16 ta jadval uchun migratsiya fayllarini yozish va bazaga qo'llash
- [x] Database ulanish utility (`db/pool.ts` — raw pg pool, slow query alert, tx)
- [x] Asosiy middleware'lar (error handler, request tracer, logger, cors, helmet)
- [x] Demo seeder (`npm run seed` — Hosil Market, mahsulotlar va global katalog)
- [x] Redis kesh infratuzilmasi (`infrastructure/cache/redis.ts` — Graceful Degradation)
- [x] Media Asset Deduplication tizimi (`infrastructure/storage/media-storage.service.ts` — SHA-256 Reference Counting)

### BOSQICH 1: Auth + Do'kon yaratish — YAKUNLANDI ✅
> Maqsad: Birinchi do'konni yaratish va Telegram orqali kirish imkoniyati

- [x] Telegram InitData tekshiruvi (HMAC-SHA256, replay-attack va timing-attack himoyasi)
- [x] JWT token generatsiya va tekshiruv (`jwt.ts`)
- [x] Auth middleware va Guardlar (`requireAuth`, `optionalAuth`, `requireRole`, `resolveTenant`, `validateBody`)
- [x] DDD Core qatlamlari (6 ta Entity, 6 ta Repository interfeysi)
- [x] User repository (`PgUserRepository` — Raw SQL upsert)
- [x] Store repository (`PgStoreRepository` — Raw SQL CRUD)
- [x] Auth moduli (`/api/v1/auth/telegram`, `/api/v1/auth/me`)
- [x] Store moduli (`/api/v1/store/profile`, `/api/v1/store/:storeId`, `/api/v1/shop/:storeSlug/info`, `/api/v1/admin/stores`)
- [ ] Telegram bot webhook registration (dinamik)
- [ ] Bot `/start` komandasi → Mini App tugmasi

### BOSQICH 2: Mahsulotlar va kategoriyalar — BACKEND YAKUNLANDI ✅
> Maqsad: Do'kon egasi mahsulotlarni qo'sha olishi va boshqarishi

- [x] Categories CRUD API (Raw SQL, slug generation, reorder, active filter)
- [x] Products CRUD API (Raw SQL, pagination with COUNT(*) OVER(), TSVECTOR search)
- [x] Rasm yuklash va DRY Deduplication (SHA-256 xesh, reference-counting, avto-tozalash)
- [x] Redis kesh integratsiyasi (tezkor katalog, invalidation on mutations)
- [x] Stock boshqaruvi (qoldiq o'zgartirish, low stock alerts)
- [ ] Frontend admin: Kategoriyalar va Mahsulotlar boshqaruvi

### BOSQICH 3: Mijoz Mini App — BAJARILDI ✅
> Maqsad: Xaridor mahsulotlarni ko'rib, savatga qo'shib, buyurtma bera olishi

- [x] Telegram Mini App SDK integratsiyasi (ready, expand, themeParams CSS sync)
- [x] Bosh sahifa (kategoriyalar, mahsulotlar 2-ustunli grid, suzuvchi savat tugmasi)
- [x] Kategoriya bo'yicha filterlash (gorizontal scrollable chiplar)
- [x] Mahsulot qidirish (debounce, real-time qidiruv, natijalar soni)
- [x] Mahsulot tafsilotlari sahifasi (galereya, chegirma nishoni, qoldiq statusi, tavsif)
- [x] Savat (qo'shish, miqdor o'zgartirish, o'chirish, minimal buyurtma nazorati)
- [x] Buyurtma rasmiylashtirish (Telegram ma'lumotlari avto-to'ldirish, yetkazish/olib ketish, to'lov turi)
- [x] Buyurtmalar tarixi va tafsilotlar cheki (/orders, /orders/:id)
- [x] Haptic Feedback (light, selection, medium, success, error) va BackButton integratsiyasi

### BOSQICH 4: Buyurtmalar tizimi — BAJARILDI ✅
> Maqsad: Buyurtma lifecycle to'liq ishlashi

- [x] Buyurtma yaratish (savat → order, stock kamaytirish, atomik tranzaksiya)
- [x] Buyurtma statuslarini o'zgartirish (admin va telegram callback)
- [x] Telegram bildirishnoma (yangi buyurtma cheki → do'kon guruhiga/egasiga)
- [x] Inline tugmalar (✅ Qabul qilish / ❌ Rad etish) → status o'zgartirish va stock tiklash
- [x] Mijozga buyurtma holati xabari (avtomatik Telegram xabar)
- [x] Buyurtmalar tarixi va tafsilotlar cheki (mijoz API + Frontend)
- [x] Buyurtmalar ro'yxati (admin API)

### BOSQICH 5: Ommaviy import va Global Katalog — BAJARILDI ✅
> Maqsad: Do'kondor tezda 100-1000 lab mahsulotni yuklashi va Global Katalogdan tayyor tiniq rasmlarni qayta yuklamasdan (DRY) foydalanishi

- [x] Excel/CSV import (xlsx parser, dinamik ustunlar moslashuvi, kategoriya avto-yaratish, bazaga upsert)
- [x] Smart Media Auto-link (Shtrix-kod bo'yicha Global Katalogdagi tiniq studiya rasmlarini avtomatik biriktirish)
- [x] AI va Qoidaviy Post Parsing (Gemini Flash integratsiyasi + Regex fallback orqali tovarlar ro'yxatini ajratib olish)
- [x] Import progress tracking (`import_jobs` jadvali orqali holat, muvaffaqiyat va xatolar hisobi)
- [x] Global katalog qidiruv va Adoption API (Shtrix-kod/matnli qidiruv, do'konga 0 bayt qo'shimcha disk sarfi bilan o'zlashtirish)
- [x] Shtrix-kod skaner API (`GET /api/v1/store/catalog/barcode/:barcode` orqali tezkor ma'lumot olish)

### BOSQICH 6: Moliya va hisobotlar — BAJARILDI ✅
> Maqsad: Do'kon egasi kirim-chiqim va sotuvlarni nazorat qilishi, analitika va grafik ma'lumotlarini olishi

- [x] Kunlik / haftalik / oylik sotuvlar hisoboti (`generate_series` vaqt seriyalari bilan to'liq grafik API)
- [x] Top mahsulotlar (daromad, miqdor va umumiy sotuvdagi foiz ulushi bo'yicha)
- [x] Kategoriyalar bo'yicha sotuv tahlili (daromad va mahsulotlar soni bo'yicha)
- [x] Kirim-chiqim qaydnomasi (manual tranzaksiyalar, filtrlash, sana va paginatsiya)
- [x] Buyurtma yetkazilganda (`delivered`) avtomatik tushum qaydnomasi integratsiyasi
- [x] Moliya xulosasi (Summary: Sof balans, bugungi/oylik tushum va chiqim, AOV va kutilayotgan buyurtmalar)

### BOSQICH 7: POS integratsiyasi — BAJARILDI ✅
> Maqsad: Jismoniy kassadan sotilgan tovarlar FLEX da ham yangilanishi va 1C sinxronizatsiyasi

- [x] POS webhook API (`POST /api/v1/integrations/pos/sale` — kassa sotuvi, stock kamaytirish, avto-tushum)
- [x] Stock sinxronizatsiya API (`POST /api/v1/integrations/pos/stock-sync` — ommaviy qoldiq va narx yangilash)
- [x] FLEX Sync Agent (1C uchun) — `tools/sync-agent/agent.ts` alohida CLI mini-dasturi (JSON/CSV)
- [x] API kalitlar va xavfsiz autentifikatsiya (`X-POS-Api-Key` middleware, sozlamalar va regenerate API)
- [x] POS audit jurnali (`pos_sync_logs` jadvali orqali har bir kassa amalini kuzatish)

### BOSQICH 8: Super Admin panel — ~2 kun
> Maqsad: Platformani markaziy boshqarish

- [ ] Do'konlar ro'yxati, statistika
- [ ] Global katalog boshqaruvi
- [ ] Monitoring va alertlar

### BOSQICH 9: Optimizatsiya va polish — doimiy
> Maqsad: Tezlik, UX va barqarorlikni oshirish

- [ ] Performance optimizatsiya (query indekslar, kesh)
- [ ] Error tracking va logging
- [ ] Unit va integration testlar
- [ ] SEO va meta taglar (Mini App uchun share)
- [ ] PWA imkoniyatlari
- [ ] Xavfsizlik auditi

---

## Eslatmalar

- Har bir bosqich **mustaqil deploy qilinishi** mumkin (Lego prinsipi)
- Keyingi bosqichga o'tish uchun oldingi bosqich **to'liq ishlashi** shart
- Har bir bosqich oxirida **test** o'tkaziladi
- Dizayn manbalarini o'rganib, eng yaxshi amaliyotlarni qo'llash
