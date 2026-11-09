import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // media_assets — Rasmlarni deduplikatsiya qilish va Reference-Count (DRY) hisobini yuritish jadvali
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS media_assets (
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

    CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(file_hash);
    CREATE INDEX IF NOT EXISTS idx_media_assets_url ON media_assets(url);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS media_assets CASCADE;
  `);
}
