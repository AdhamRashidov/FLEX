# FLEX — Flexible Marketplace Platform

## Loyiha haqida qisqacha

FLEX — Telegram Mini App ichida ishlaydigan **Multi-tenant SaaS marketplace** platformasi.
Har qanday mahalliy do'kon (oziq-ovqat, kiyim-kechak, xo'jalik mollari va b.) o'z nomidagi
Telegram botini ochib, o'z mijozlariga tovarlarini onlayn sotish imkoniyatiga ega bo'ladi.

**Asosiy biznes modeli:** White-label SaaS. Har bir do'kon o'z boti orqali o'zining Mini App'ini
ochadi, lekin orqa fonda **bitta yagona backend va bitta database** ishlaydi (Multi-tenant, `store_id` asosida).

Kelajakda bitta umumiy "FLEX Agregator" boti ham qo'shilishi mumkin — unda barcha ro'yxatdan
o'tgan do'konlar ro'yxati / xaritada ko'rinadi.

---

## Texnologiyalar steki

### Backend
- **Runtime:** Node.js (LTS)
- **Framework:** Express.js
- **Language:** TypeScript (strict mode)
- **Database driver:** `pg` (node-postgres) — **ORM ISHLATILMAYDI**
- **SQL:** Barcha querylar qo'lda yoziladi (Raw SQL, parametrlashtirilgan)
- **Kesh va Navbat:** Redis (`ioredis`) — Graceful Degradation (Redis o'chiq bo'lsa ham tizim qulamaydi)
- **Media Asset Menejeri:** SHA-256 Content Hashing + Reference Counting (1 ta rasm 1000 mahsulotga, 100% DRY)
- **Migratsiyalar:** `node-pg-migrate`
- **Validatsiya:** `zod`
- **Auth:** Telegram InitData HMAC-SHA256 tekshiruvi + JWT tokenlar

### Frontend
- **Framework:** React 18+
- **Build tool:** Vite
- **Styling:** TailwindCSS
- **UI komponentlar:** shadcn/ui
- **Server state:** TanStack Query (React Query)
- **Telegram SDK:** `@telegram-apps/sdk-react`
- **Routing:** React Router v7

### Database
- **DBMS:** PostgreSQL 16+
- **Hosting (dev/MVP):** Neon.tech (bepul tarif)

### Infratuzilma (MVP bosqichi — $0 byudjet)
- **Frontend hosting:** Vercel yoki Cloudflare Pages
- **Backend hosting:** Render.com (bepul tarif)
- **Media/rasmlar:** Cloudflare R2 yoki Telegram CDN (file_id)
- **DNS/SSL:** Cloudflare (bepul)

---

## Arxitektura printsiplari

### Backend arxitekturasi
```
src/
├── config/          # Muhit sozlamalari, konstantalar
├── db/              # Database ulanish, migratsiyalar, query builder helpers
├── modules/         # Har bir biznes-modul alohida papkada
│   ├── auth/        # Telegram auth, JWT
│   ├── store/       # Do'kon (tenant) boshqaruvi
│   ├── product/     # Mahsulotlar CRUD
│   ├── category/    # Kategoriyalar
│   ├── order/       # Buyurtmalar
│   ├── cart/        # Savat
│   ├── user/        # Foydalanuvchilar
│   ├── finance/     # Kirim-chiqim, moliya hisobotlari
│   ├── integration/ # POS/1C sinxronizatsiya, TG scraper
│   └── media/       # Rasm yuklash va boshqarish
├── middleware/       # Auth, error handler, tenant resolver, rate limiter
├── shared/          # Umumiy tiplar, enumlar, utillar, dekoratorlar
├── bot/             # Telegram bot webhook handler (dinamik multi-bot)
└── server.ts        # Express app entry point
```

### Har bir modul ichki strukturasi
```
modules/product/
├── product.controller.ts    # Route handlerlar (req/res)
├── product.service.ts       # Biznes logika
├── product.repository.ts    # Raw SQL querylar (FAQAT shu yerda SQL yoziladi)
├── product.routes.ts        # Express router
├── product.types.ts         # TypeScript interfeys, tip, enum
├── product.validation.ts    # Zod sxemalari
└── product.test.ts          # Testlar
```

---

## Kod yozish qoidalari (QATIY!)

### TypeScript
- `strict: true` — har doim
- `any` tipi **TAQIQLANGAN**. `unknown` ishlatib, keyin type guard qiling
- Har bir funksiya, klass va interfeys uchun JSDoc yoki izoh yoziladi
- Barcha tiplar `.types.ts` fayllarida alohida saqlanadi
- `enum` o'rniga `as const` object + type inference afzal ko'riladi
- Barrel exports (`index.ts`) har bir modulda bo'ladi

### SQL xavfsizligi
- **String interpolation TAQIQLANGAN:** `` `WHERE id = ${id}` `` ❌
- **Faqat parametrlashtirilgan querylar:** `query('WHERE id = $1', [id])` ✅
- Har bir query uchun natija tipi aniq belgilanadi (`QueryResult<ProductRow>`)
- Murakkab querylar uchun izohlar (comment) yoziladi
- Tranzaksiyalar `BEGIN/COMMIT/ROLLBACK` bilan boshqariladi

### Multi-tenancy xavfsizligi
- **Har bir jadvalda `store_id` ustuni bor** (foydalanuvchilar bundan mustasno)
- Har bir SQL queryda `WHERE store_id = $1` **MAJBURIY**
- Middleware orqali `req.storeId` o'rnatiladi va barcha service/repository larga uzatiladi
- Biror query'da `store_id` filtri yo'q bo'lsa — bu **BUG** hisoblanadi

### API dizayni
- RESTful: `GET /api/v1/stores/:storeId/products`
- Versiyalash: `/api/v1/...`
- Xatolik formati: `{ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "..." } }`
- Muvaffaqiyat formati: `{ success: true, data: {...}, meta: { pagination: {...} } }`
- Paginatsiya: `?page=1&limit=20` (default limit: 20, max: 100)

### Git konvensiyalari
- **Asosiy Dev muhit:** `adham` (barcha yangi kodlar, ishlab chiqish va faol commitlar doimiy shu branchda bo'ladi)
- **Production muhit:** `main` (faqatgina hamma narsa toza va to'liq sinovdan o'tgandan keyin `adham` dan `main` ga merge qilinadi)
- **Commit xabarlari:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)

### Kodga izoh yozish
- Barcha mavjud izohlar (comment/docstring) saqlanadi, o'chirilmaydi
- Yangi funksiyalarga JSDoc yoziladi
- Murakkab biznes logikaga inline izoh qo'yiladi
- TODO/FIXME/HACK teglaridan foydalanish mumkin

---

## Muhit o'zgaruvchilari (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/flex_db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Telegram
BOT_TOKEN=123456:ABC-DEF...          # Asosiy FLEX bot tokeni
WEBHOOK_DOMAIN=https://api.flex.uz
WEBHOOK_SECRET=random-secret

# Media storage
MEDIA_STORAGE=cloudflare_r2          # yoki "telegram_cdn"
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET_NAME=flex-media

# AI (Telegram kanaldan tovar import uchun)
GEMINI_API_KEY=...

# App
NODE_ENV=development
PORT=3000
CORS_ORIGIN=https://flex.vercel.app
```

---

## Ishlash tartibi

1. Har bir yangi funksionallik uchun avval `.types.ts` va `.validation.ts` yoziladi
2. Keyin `.repository.ts` (SQL querylar)
3. Keyin `.service.ts` (biznes logika)
4. Keyin `.controller.ts` va `.routes.ts`
5. Oxirida test yoziladi
6. Migratsiya kerak bo'lsa — `db/migrations/` ga qo'shiladi

---

## Taqiqlangan narsalar

- ❌ `any` tipi
- ❌ ORM (Prisma, TypeORM, Sequelize, Drizzle)
- ❌ SQL string interpolation
- ❌ `console.log` (faqat `logger` utility ishlatiladi)
- ❌ `store_id` filtrisiz query
- ❌ God-object / god-function (har bir funksiya bitta vazifa bajaradi)
- ❌ Hardcoded qiymatlar (konstantalar `config/` da saqlanadi)
- ❌ Hardcoded ranglar (#ffffff, #000) — doim Telegram `themeParams` ishlatiladi
- ❌ Spinners o'rniga Skeleton ishlatilmasligi (Skeleton shart)
- ❌ Bo'sh (Empty) yoki Xato (Error/Retry) holatlarisiz sahifalar yaratish

---

## UI/UX va TMA Dizayn Standartlari

Barcha Frontend qismlari [DESIGN.md](file:///c:/Users/softex/Desktop/work/flex/DESIGN.md) faylida belgilangan qoidalarga 100% amal qilishi SHART:
- **Telegram Native Feel:** Telegram `MainButton`, `BackButton`, `HapticFeedback`, va `themeParams` dan to'liq foydalanish.
- **8 ta Majburiy Holat:** Har bir komponentda `Default`, `Hover`, `Pressed`, `Focus`, `Disabled`, `Loading (Skeleton)`, `Error (Retry)`, `Empty State`.
- **Mobil Ergonomika:** Minimal 48x48px touch-target, Thumb-zone qulayligi, 320px dan boshlanuvchi moslashuvchanlik.
- **Real kontent:** Hech qanday "Lorem ipsum"siz toza, tushunarli o'zbek tilidagi matnlar.

