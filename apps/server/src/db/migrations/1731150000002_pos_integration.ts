import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- 1. stores jadvaliga POS integratsiya ustunlari
    ALTER TABLE stores ADD COLUMN IF NOT EXISTS pos_api_key VARCHAR(64) UNIQUE;
    ALTER TABLE stores ADD COLUMN IF NOT EXISTS pos_enabled BOOLEAN DEFAULT TRUE;
    ALTER TABLE stores ADD COLUMN IF NOT EXISTS pos_last_sync_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_stores_pos_api_key ON stores(pos_api_key) WHERE pos_api_key IS NOT NULL;

    -- 2. pos_sync_logs — POS amallari va sinxronizatsiya jurnali
    CREATE TABLE IF NOT EXISTS pos_sync_logs (
      id              BIGSERIAL PRIMARY KEY,
      store_id        BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      action          VARCHAR(50) NOT NULL, -- 'sale', 'stock_sync'
      items_count     INTEGER DEFAULT 0,
      success         BOOLEAN DEFAULT TRUE,
      payload         JSONB,
      error_message   TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pos_sync_logs_store ON pos_sync_logs(store_id, created_at DESC);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS pos_sync_logs CASCADE;
    ALTER TABLE stores DROP COLUMN IF EXISTS pos_last_sync_at;
    ALTER TABLE stores DROP COLUMN IF EXISTS pos_enabled;
    ALTER TABLE stores DROP COLUMN IF EXISTS pos_api_key;
  `);
}
