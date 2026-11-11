import * as xlsx from 'xlsx';
import { query, queryOne, tx } from '../../infrastructure/database/pool.js';
import { cacheService } from '../../infrastructure/cache/redis.js';
import { config } from '../../config/index.js';
import { logger } from '../../common/logger/index.js';
import { ValidationError, NotFoundError } from '../../common/errors/index.js';
import type { ProductUnit } from '@flex/shared';

export interface ImportSummary {
  jobId: number;
  totalItems: number;
  importedItems: number;
  failedItems: number;
  errors: Array<{ row: number; error: string; raw?: unknown }>;
}

export interface ParsedProductFromAi {
  name: string;
  price: number;
  category?: string;
  unit?: ProductUnit;
  description?: string;
}

export interface ImportJobDTO {
  id: number;
  storeId: number;
  source: string;
  status: string;
  totalItems: number;
  importedItems: number;
  failedItems: number;
  errorLog: unknown;
  fileUrl: string | null;
  sourceChannel: string | null;
  createdAt: string;
  completedAt: string | null;
}

function mapJobRow(row: Record<string, unknown>): ImportJobDTO {
  return {
    id: Number(row['id']),
    storeId: Number(row['store_id']),
    source: String(row['source']),
    status: String(row['status']),
    totalItems: Number(row['total_items'] ?? 0),
    importedItems: Number(row['imported_items'] ?? 0),
    failedItems: Number(row['failed_items'] ?? 0),
    errorLog: row['error_log'],
    fileUrl: (row['file_url'] as string) ?? null,
    sourceChannel: (row['source_channel'] as string) ?? null,
    createdAt: new Date(row['created_at'] as string).toISOString(),
    completedAt: row['completed_at'] ? new Date(row['completed_at'] as string).toISOString() : null,
  };
}

export class ImportService {
  /**
   * Excel yoki CSV fayl orqali tovarlarni ommaviy yuklash
   */
  async importExcelOrCsv(
    storeId: number,
    fileBuffer: Buffer,
    filename: string
  ): Promise<ImportSummary> {
    // 1. Ishni import_jobs jadvalida ro'yxatga olish
    const jobRes = await query<{ id: string }>(
      `INSERT INTO import_jobs (store_id, source, status, file_url)
       VALUES ($1, 'excel', 'processing', $2)
       RETURNING id`,
      [storeId, filename]
    );
    const jobId = Number(jobRes.rows[0]?.id);

    try {
      // 2. Excel faylni o'qish (Bufferdan)
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new ValidationError('Excel faylda sahifalar topilmadi');
      }

      const sheet = workbook.Sheets[firstSheetName];
      if (!sheet) {
        throw new ValidationError('Sahifa ma\'lumotlarini o\'qib bo\'lmadi');
      }

      const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rawRows.length === 0) {
        throw new ValidationError('Excel fayl bo\'sh');
      }

      let importedCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; error: string; raw?: unknown }> = [];

      // 3. Har bir qatorni qayta ishlash
      for (let i = 0; i < rawRows.length; i++) {
        const raw = rawRows[i];
        if (!raw) continue;
        const rowNum = i + 2; // Excel da sarlavha 1-qator bo'ladi

        try {
          // Ustunlar nomini moslashuvchan aniqlash (nomi, narxi, shtrix_kod, qoldiq...)
          const name = String(
            raw['name'] || raw['nomi'] || raw['Mahsulot'] || raw['tovar'] || raw['Наименование'] || ''
          ).trim();

          const rawPrice =
            raw['price'] || raw['narx'] || raw['narxi'] || raw['Цена'] || 0;
          const price = parseInt(String(rawPrice).replace(/\D/g, ''), 10);

          const rawBarcode = raw['barcode'] || raw['shtrix_kod'] || raw['shtrixkod'] || raw['Штрихкод'];
          const barcode = rawBarcode ? String(rawBarcode).trim() : null;

          const rawStock = raw['stock'] || raw['qoldiq'] || raw['soni'] || raw['miqdor'] || raw['Количество'] || 0;
          const stockQuantity = Math.max(0, parseInt(String(rawStock).replace(/\D/g, ''), 10) || 0);

          const rawCategory = raw['category'] || raw['kategoriya'] || raw['toifa'] || raw['Категория'];
          const categoryName = rawCategory ? String(rawCategory).trim() : null;

          const rawUnit = raw['unit'] || raw['birlik'] || raw['Ед.'] || 'dona';
          const unit = String(rawUnit).trim().toLowerCase() as ProductUnit;

          const rawDesc = raw['description'] || raw['tavsif'] || raw['Описание'];
          const description = rawDesc ? String(rawDesc).trim() : null;

          if (!name) {
            throw new Error('Mahsulot nomi kiritilmagan');
          }
          if (isNaN(price) || price < 0) {
            throw new Error('Narx noto\'g\'ri kiritilgan');
          }

          // Tranzaksiyada mahsulotni kiritish yoki yangilash
          await tx(async (client) => {
            let categoryId: number | null = null;

            // Kategoriya topish yoki yaratish
            if (categoryName) {
              const catRes = await client.query<{ id: string }>(
                'SELECT id FROM categories WHERE store_id = $1 AND name ILIKE $2 LIMIT 1',
                [storeId, categoryName]
              );
              if (catRes.rows.length > 0) {
                categoryId = Number(catRes.rows[0]?.id);
              } else {
                const slug = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const newCat = await client.query<{ id: string }>(
                  `INSERT INTO categories (store_id, name, slug)
                   VALUES ($1, $2, $3)
                   RETURNING id`,
                  [storeId, categoryName, `${slug}-${Date.now().toString().slice(-4)}`]
                );
                categoryId = Number(newCat.rows[0]?.id);
              }
            }

            // Agar shtrix-kod bo'lsa: mavjud tovar bormi?
            let existingId: number | null = null;
            if (barcode) {
              const exRes = await client.query<{ id: string }>(
                'SELECT id FROM products WHERE store_id = $1 AND barcode = $2 LIMIT 1',
                [storeId, barcode]
              );
              if (exRes.rows.length > 0) {
                existingId = Number(exRes.rows[0]?.id);
              }
            }

            if (existingId) {
              // Narx va qoldiqni yangilash
              await client.query(
                `UPDATE products
                 SET price = $1,
                     stock_quantity = $2,
                     updated_at = NOW()
                 WHERE id = $3 AND store_id = $4`,
                [price, stockQuantity, existingId, storeId]
              );
            } else {
              // Yangi tovar qo'shish
              const prodRes = await client.query<{ id: string }>(
                `INSERT INTO products (
                   store_id, category_id, name, description, barcode, price, unit,
                   stock_quantity, track_stock, is_active
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [storeId, categoryId, name, description, barcode, price, unit || 'dona', stockQuantity, true, true]
              );
              const newProdId = Number(prodRes.rows[0]?.id);

              // Agar shtrix-kod Global Katalogda bo'lsa: tayyor rasmini ulaymiz (Smart Suggestion)
              if (barcode) {
                const globalRow = await client.query<{ image_url: string | null }>(
                  'SELECT image_url FROM global_catalog WHERE barcode = $1 AND image_url IS NOT NULL LIMIT 1',
                  [barcode]
                );
                if (globalRow.rows[0]?.image_url) {
                  await client.query(
                    `INSERT INTO product_images (product_id, store_id, url, is_primary)
                     VALUES ($1, $2, $3, true)`,
                    [newProdId, storeId, globalRow.rows[0].image_url]
                  );
                }
              }
            }
          });

          importedCount++;
        } catch (err: unknown) {
          failedCount++;
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ row: rowNum, error: msg, raw });
        }
      }

      // 4. Keshni tozalash
      await cacheService.delPattern(`shop:products:${storeId}:*`);

      // 5. Job holatini yakunlash
      await query(
        `UPDATE import_jobs
         SET status = 'completed',
             total_items = $1,
             imported_items = $2,
             failed_items = $3,
             error_log = $4,
             completed_at = NOW()
         WHERE id = $5`,
        [rawRows.length, importedCount, failedCount, JSON.stringify(errors), jobId]
      );

      return {
        jobId,
        totalItems: rawRows.length,
        importedItems: importedCount,
        failedItems: failedCount,
        errors,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await query(
        `UPDATE import_jobs
         SET status = 'failed',
             error_log = $1,
             completed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify([{ error: msg }]), jobId]
      );
      throw err;
    }
  }

  /**
   * Gemini Flash AI orqali Telegram kanal post matnidan tovar ma'lumotlarini ajratib olish
   */
  async parseTelegramPostWithAi(text: string): Promise<ParsedProductFromAi[]> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new ValidationError('Post matni kiritilmagan');
    }

    const apiKey = config.ai.geminiApiKey;

    if (apiKey) {
      try {
        const prompt = `Quyidagi Telegram kanal postidan tovarlar ro'yxatini (nomi, narxi, kategoriyasi, o'lchov birligi va tavsifi) ajratib ol.
Faqat va faqat quyidagi toza JSON massiv formatida javob ber:
[
  {
    "name": "Tovar nomi (aniq va toza)",
    "price": 15000 (faqat son so'mda, bo'sh joylarsiz),
    "category": "Kategoriya nomi (masalan: Ichimliklar, Sut mahsulotlari, Go'sht va h.k.)",
    "unit": "dona" (yoki "kg", "litr", "metr", "pachka"),
    "description": "Mahsulot haqida qisqacha ma'lumot"
  }
]

Post matni:
"""${trimmed}"""`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        });

        if (response.ok) {
          const json = await response.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const valid = list.filter((p): p is ParsedProductFromAi => Boolean(p && p.name && typeof p.price === 'number'));
            if (valid.length > 0) {
              return valid;
            }
          }
        }
      } catch (err) {
        logger.warn('ImportService', `Gemini AI xatosi, qoidalarga asoslangan parsingga o'tiladi: ${err}`);
      }
    }

    // AI kalit bo'lmaganda yoki xatolikda: Qoidalarga asoslangan avto-ajratuvchi (Regex)
    return this.fallbackRegexParser(trimmed);
  }

  /**
   * Qoidalarga asoslangan matn ajratgich (AI mavjud bo'lmaganda ishlaydi)
   * Bir nechta mahsulot ro'yxatini yoki yakka mahsulotni aniqlaydi
   */
  private fallbackRegexParser(text: string): ParsedProductFromAi[] {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const results: ParsedProductFromAi[] = [];

    // Har bir qatorni tekshiramiz: "1. Tovar nomi - 15 000 so'm" yoki "Tovar: 20000"
    const lineRegex = /^(?:\d+[\.)]\s*)?(.*?)\s*(?:[:—\-]|narxi|price)\s*(\d[\d\s.,]{2,10})\s*(?:so['`]?m|uzs|sum)?/i;

    for (const line of lines) {
      const match = line.match(lineRegex);
      if (match && match[1] && match[2]) {
        const name = match[1].replace(/^[^\w\u0400-\u04FF]+/i, '').trim();
        const price = parseInt(match[2].replace(/\D/g, ''), 10);
        if (name && !isNaN(price) && price > 0) {
          results.push({
            name: name.slice(0, 100),
            price,
            unit: 'dona',
          });
        }
      }
    }

    if (results.length > 0) {
      return results;
    }

    // Agar ro'yxat shaklida topilmasa, butun postni yakka mahsulot deb tahlil qilamiz
    const name = lines[0] || 'Yangi mahsulot';
    let price = 0;
    const priceMatch = text.match(/(?:narxi|narx|baho|price)?\s*[:—\-]?\s*(\d[\d\s.,]{2,10})\s*(?:so['`]?m|uzs|sum)?/i);
    if (priceMatch && priceMatch[1]) {
      price = parseInt(priceMatch[1].replace(/\D/g, ''), 10) || 0;
    }

    return [{
      name: name.slice(0, 100),
      price: price > 0 ? price : 10000,
      unit: 'dona',
      description: lines.slice(1).join('\n').slice(0, 500) || undefined,
    }];
  }

  /**
   * Do'konning oldingi import amallari tarixi
   */
  async getImportJobs(storeId: number): Promise<ImportJobDTO[]> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM import_jobs 
       WHERE store_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [storeId]
    );
    return rows.map(mapJobRow);
  }

  /**
   * Bitta import amalining holati
   */
  async getImportJobById(storeId: number, jobId: number): Promise<ImportJobDTO> {
    const job = await queryOne<Record<string, unknown>>(
      'SELECT * FROM import_jobs WHERE store_id = $1 AND id = $2',
      [storeId, jobId]
    );
    if (!job) {
      throw new NotFoundError('Import amali');
    }
    return mapJobRow(job);
  }
}
