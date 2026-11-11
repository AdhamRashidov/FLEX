# 🤖 FLEX 1C / POS Sync Agent

FLEX platformasi bilan do'kondagi 1C yoki lokal kassa (POS) tizimlari o'rtasida tovarlar qoldig'i (stock) va narxlarini avtomatik sinxronizatsiya qiluvchi mini-dastur.

---

## 🚀 Qanday ishlaydi?
1. 1C yoki kassa dasturi tovarlar qoldig'ini faylga (JSON yoki CSV) eksport qiladi (masalan: `stock.json` yoki `stock.csv`).
2. Sync Agent har **N soniyada** (masalan har 60 soniyada) fayldagi o'zgarishlarni tekshiradi.
3. Yangilangan qoldiqlarni FLEX Server API ga xavfsiz `X-POS-Api-Key` orqali uzatadi.
4. Server bir zumda tovarlar qoldig'ini yangilab, mijozlar Telegram Mini App'ida eng so'nggi ma'lumotlarni ko'rsatadi.

---

## 📋 Ishga tushirish (Windows / Linux)

### 1. Bir martalik sinxronizatsiya:
```bash
npx tsx tools/sync-agent/agent.ts --key=flex_pos_demo_hosil_market_secret_123 --file=./stock.json --once
```

### 2. Har 60 soniyada muntazam fonda ishlab turish:
```bash
npx tsx tools/sync-agent/agent.ts --key=flex_pos_demo_hosil_market_secret_123 --file=./stock.json --interval=60
```

---

## 📁 Qo'llab-quvvatlanadigan fayl formatlari

### Variant A: JSON formati (`stock.json`)
```json
[
  { "barcode": "5449000000996", "stockQuantity": 45, "price": 14000 },
  { "barcode": "4607001000012", "stockQuantity": 120, "price": 6500 }
]
```

### Variant B: CSV formati (`stock.csv`)
```csv
barcode,stockQuantity,price
5449000000996,45,14000
4607001000012,120,6500
```
