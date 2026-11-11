import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- BOSQICH 9: Query index optimization
    CREATE INDEX IF NOT EXISTS idx_orders_store_status_date ON orders(store_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_store_type_date ON transactions(store_id, type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_store_category_active ON products(store_id, category_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_pos_sync_logs_store_date ON pos_sync_logs(store_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_store_stock ON products(store_id, stock_quantity) WHERE track_stock = TRUE;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_orders_store_status_date;
    DROP INDEX IF EXISTS idx_transactions_store_type_date;
    DROP INDEX IF EXISTS idx_products_store_category_active;
    DROP INDEX IF EXISTS idx_pos_sync_logs_store_date;
    DROP INDEX IF EXISTS idx_products_store_stock;
  `);
}
