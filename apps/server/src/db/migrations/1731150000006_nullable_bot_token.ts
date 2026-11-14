import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Do'kon ro'yxatdan o'tganda Telegram bot_token ixtiyoriy bo'lishi (keyin sozlamalarda ulanadi)
    ALTER TABLE stores ALTER COLUMN bot_token DROP NOT NULL;
    ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_bot_token_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_bot_token ON stores(bot_token) WHERE bot_token IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_stores_bot_token;
    ALTER TABLE stores ADD CONSTRAINT stores_bot_token_key UNIQUE(bot_token);
    ALTER TABLE stores ALTER COLUMN bot_token SET NOT NULL;
  `);
}
