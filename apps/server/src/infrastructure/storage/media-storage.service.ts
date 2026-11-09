import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { query, queryOne } from '../database/pool.js';
import { logger } from '../../common/logger/index.js';

interface MediaAssetRow {
  id: string;
  url: string;
  file_hash: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  reference_count: number;
}

export interface SaveMediaResult {
  url: string;
  isReused: boolean;
  referenceCount: number;
}

export class MediaStorageService {
  private uploadDir: string;

  constructor() {
    // Lokal fayl saqlash papkasi (apps/server/uploads/images)
    this.uploadDir = path.resolve(process.cwd(), 'uploads', 'images');
  }

  /**
   * Papka mavjudligini ta'minlash
   */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  /**
   * Rasmni saqlash yoki mavjud bo'lsa qayta ishlatish (100% DRY Deduplication)
   *
   * Agar aynan shu rasm (baytma-bayt bir xil) avval yuklangan bo'lsa:
   * 1. Qattiq diskka yangi fayl yozilmaydi (0 bayt ortiqcha joy sarflanadi)!
   * 2. Bazadagi reference_count 1 taga oshiriladi.
   * 3. 1000 ta mahsulot bitta umumiy rasm URL'iga ega bo'ladi.
   */
  async saveOrReuse(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
  ): Promise<SaveMediaResult> {
    // 1. Faylning SHA-256 xeshini hisoblaymiz (faylning unikal barmoq izi)
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Bazada ushbu xeshli rasm bormi-yo'qligini tekshiramiz
    const existing = await queryOne<MediaAssetRow>(
      'SELECT id, url, storage_path, reference_count FROM media_assets WHERE file_hash = $1',
      [fileHash],
    );

    if (existing) {
      // DEDUPLIKATSIYA: Rasm allaqachon mavjud! Faqat hisoblagichni oshiramiz
      const newCount = existing.reference_count + 1;
      await query(
        'UPDATE media_assets SET reference_count = $1, updated_at = NOW() WHERE file_hash = $2',
        [newCount, fileHash],
      );

      logger.info(
        'MediaStorage',
        `♻️ Rasm qayta ishlatildi (DRY Deduplication): ${existing.url} | Hozirgi ulanishlar soni: ${newCount}`,
      );

      return {
        url: existing.url,
        isReused: true,
        referenceCount: newCount,
      };
    }

    // 3. Yangi rasm: Diskka yozamiz
    await this.ensureDir();
    const ext = path.extname(originalFilename).toLowerCase() || '.webp';
    const filename = `${fileHash}${ext}`;
    const storagePath = path.join(this.uploadDir, filename);

    await fs.writeFile(storagePath, buffer);

    // Ommaviy kirish URL manzili
    const publicUrl = `/uploads/images/${filename}`;

    // 4. Bazaga yangi rasm aktivini yozamiz
    await query(
      `INSERT INTO media_assets (url, file_hash, storage_path, file_size, mime_type, reference_count)
       VALUES ($1, $2, $3, $4, $5, 1)`,
      [publicUrl, fileHash, storagePath, buffer.length, mimeType],
    );

    logger.info('MediaStorage', `💾 Yangi rasm saqlandi: ${publicUrl} (${(buffer.length / 1024).toFixed(1)} KB)`);

    return {
      url: publicUrl,
      isReused: false,
      referenceCount: 1,
    };
  }

  /**
   * Mahsulot o'chirilganda yoki uning rasmi o'zgarganda chaqiriladi (Garbage Collection)
   *
   * Mantiq:
   * 1. reference_count ni 1 taga kamaytiramiz.
   * 2. Agar reference_count <= 0 bo'lsa (ya'ni boshqa hech qaysi mahsulot ushbu rasmdan foydalanmayotgan bo'lsa):
   *    - Fayl qattiq diskdan o'chiriladi.
   *    - Bazadagi media_assets qaydi o'chiriladi.
   * 3. Agar reference_count > 0 bo'lsa (boshqa mahsulotlar hali ham shu rasmdan foydalanayotgan bo'lsa):
   *    - Fayl o'chirilmaydi, boshqa mahsulotlarning rasmi sinib qolmaydi!
   */
  async release(url: string): Promise<boolean> {
    const asset = await queryOne<MediaAssetRow>(
      'SELECT id, storage_path, reference_count FROM media_assets WHERE url = $1',
      [url],
    );

    if (!asset) return false;

    const newCount = asset.reference_count - 1;

    if (newCount <= 0) {
      // Hech kimga kerak emas -> diskdan va bazadan butunlay o'chiramiz!
      try {
        await fs.unlink(asset.storage_path);
        logger.info('MediaStorage', `🗑️ Keraksiz rasm diskdan to'liq o'chirildi: ${asset.storage_path}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        logger.warn('MediaStorage', `Faylni o'chirishda xatolik: ${msg}`);
      }

      await query('DELETE FROM media_assets WHERE url = $1', [url]);
      return true; // Fayl butunlay yo'q qilindi
    } else {
      // Boshqa tovarlar hali ham ishlatmoqda -> faqat hisoblagichni kamaytiramiz
      await query(
        'UPDATE media_assets SET reference_count = $1, updated_at = NOW() WHERE url = $2',
        [newCount, url],
      );
      logger.info(
        'MediaStorage',
        `ℹ️ Rasmga ulanish kamaytirildi (${url}). Hali ${newCount} ta mahsulot foydalanmoqda.`,
      );
      return false; // Fayl diskda saqlandi
    }
  }

  /**
   * Bir nechta rasmni birdaniga bo'shatish
   */
  async releaseMultiple(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.release(url);
    }
  }
}

export const mediaStorageService = new MediaStorageService();
