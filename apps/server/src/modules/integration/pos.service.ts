import crypto from 'crypto';
import { query, queryOne, tx } from '../../infrastructure/database/pool.js';
import { cacheService } from '../../infrastructure/cache/redis.js';
import { logger } from '../../common/logger/index.js';
import { NotFoundError } from '../../common/errors/index.js';
import type {
  PosSaleWebhookInput,
  PosSaleResultDTO,
  PosStockSyncInput,
  PosStockSyncResultDTO,
  PosIntegrationSettingsDTO,
} from '@flex/shared';

interface ProductLookupRow {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  track_stock: boolean;
}

export class PosService {
  /**
   * Jismoniy kassa (POS) yoki 1C dan sotuv amalga oshganda stockni avtomatik kamaytirish
   */
  async handlePosSale(
    storeId: number,
    input: PosSaleWebhookInput
  ): Promise<PosSaleResultDTO> {
    const updatedProducts: PosSaleResultDTO['updatedProducts'] = [];
    const notFoundItems: PosSaleResultDTO['notFoundItems'] = [];
    let calculatedIncome = 0;
    let createdTxId: number | undefined;

    await tx(async (client) => {
      for (const item of input.items) {
        // Tovar topish: shtrix-kod, ID yoki SKU orqali
        let sql = 'SELECT id, name, price, stock_quantity, track_stock FROM products WHERE store_id = $1';
        const params: unknown[] = [storeId];

        if (item.barcode) {
          sql += ' AND barcode = $2 LIMIT 1';
          params.push(item.barcode);
        } else if (item.productId) {
          sql += ' AND id = $2 LIMIT 1';
          params.push(item.productId);
        } else if (item.sku) {
          sql += ' AND sku = $2 LIMIT 1';
          params.push(item.sku);
        } else {
          notFoundItems.push(item);
          continue;
        }

        const res = await client.query<ProductLookupRow>(sql, params);
        const product = res.rows[0];

        if (!product) {
          notFoundItems.push(item);
          continue;
        }

        const prodId = Number(product.id);
        const soldQty = item.quantity;
        const unitPrice = item.price ?? product.price;
        calculatedIncome += unitPrice * soldQty;

        // Stockni kamaytirish (manfiy songa tushib ketmasligi uchun GREATEST(0, ...))
        const updateRes = await client.query<{ id: string; name: string; stock_quantity: number }>(
          `UPDATE products
           SET stock_quantity = GREATEST(0, stock_quantity - $1),
               updated_at = NOW()
           WHERE id = $2 AND store_id = $3
           RETURNING id, name, stock_quantity`,
          [soldQty, prodId, storeId]
        );

        const updated = updateRes.rows[0];
        if (updated) {
          updatedProducts.push({
            id: Number(updated.id),
            name: updated.name,
            soldQuantity: soldQty,
            remainingStock: Number(updated.stock_quantity),
          });
        }
      }

      // Agar sotuv summasi bo'lsa, moliyada tushum qayd qilish
      if (calculatedIncome > 0) {
        const txRes = await client.query<{ id: string }>(
          `INSERT INTO transactions (store_id, type, category, amount, description)
           VALUES ($1, 'income', 'sale', $2, $3)
           RETURNING id`,
          [
            storeId,
            calculatedIncome,
            `POS kassadan sotuv${input.receiptNumber ? ` (Chek #${input.receiptNumber})` : ''}`,
          ]
        );
        createdTxId = Number(txRes.rows[0]?.id);
      }

      // POS amallari jurnaliga yozish
      await client.query(
        `INSERT INTO pos_sync_logs (store_id, action, items_count, success, payload)
         VALUES ($1, 'sale', $2, true, $3)`,
        [storeId, input.items.length, JSON.stringify(input)]
      );

      // Oxirgi sinxronizatsiya vaqtini yangilash
      await client.query(
        'UPDATE stores SET pos_last_sync_at = NOW() WHERE id = $1',
        [storeId]
      );
    });

    // Redis keshni tozalash (yangi qoldiqlar darhol Mini Appda ko'rinsin)
    await cacheService.delPattern(`shop:products:${storeId}:*`);

    logger.info(
      'PosService',
      `🛒 POS sotuv qabul qilindi (Do'kon: ${storeId}, Sotildi: ${updatedProducts.length} tovar, Topilmadi: ${notFoundItems.length})`
    );

    return {
      success: true,
      storeId,
      totalItems: input.items.length,
      updatedProducts,
      notFoundItems,
      transactionId: createdTxId,
    };
  }

  /**
   * 1C yoki POS tizimidan tovarlar qoldig'i va narxlarini ommaviy sinxronizatsiya qilish (Bulk Stock Sync)
   */
  async handleStockSync(
    storeId: number,
    input: PosStockSyncInput
  ): Promise<PosStockSyncResultDTO> {
    let updatedCount = 0;
    const notFoundBarcodes: string[] = [];

    await tx(async (client) => {
      for (const item of input.items) {
        let updateSql = 'UPDATE products SET stock_quantity = $1';
        const params: unknown[] = [item.stockQuantity];
        let idx = 2;

        if (item.price !== undefined) {
          updateSql += `, price = $${idx++}`;
          params.push(item.price);
        }

        updateSql += `, updated_at = NOW() WHERE store_id = $${idx++}`;
        params.push(storeId);

        if (item.barcode) {
          updateSql += ` AND barcode = $${idx++} RETURNING id`;
          params.push(item.barcode);
        } else if (item.productId) {
          updateSql += ` AND id = $${idx++} RETURNING id`;
          params.push(item.productId);
        } else if (item.sku) {
          updateSql += ` AND sku = $${idx++} RETURNING id`;
          params.push(item.sku);
        } else {
          continue;
        }

        const res = await client.query<{ id: string }>(updateSql, params);
        if (res.rowCount && res.rowCount > 0) {
          updatedCount++;
        } else if (item.barcode) {
          notFoundBarcodes.push(item.barcode);
        }
      }

      // Jurnalga yozish
      await client.query(
        `INSERT INTO pos_sync_logs (store_id, action, items_count, success, payload)
         VALUES ($1, 'stock_sync', $2, true, $3)`,
        [storeId, input.items.length, JSON.stringify({ received: input.items.length, updated: updatedCount })]
      );

      // Oxirgi sinxronizatsiya vaqtini yangilash
      await client.query(
        'UPDATE stores SET pos_last_sync_at = NOW() WHERE id = $1',
        [storeId]
      );
    });

    // Redis keshni tozalash
    await cacheService.delPattern(`shop:products:${storeId}:*`);

    logger.info(
      'PosService',
      `🔄 POS stock sinxronizatsiyasi yakunlandi (Do'kon: ${storeId}, Yangilandi: ${updatedCount} ta tovar)`
    );

    return {
      success: true,
      storeId,
      totalReceived: input.items.length,
      updatedCount,
      notFoundBarcodes,
    };
  }

  /**
   * Do'konning POS sozlamalari va API kalitini olish
   */
  async getPosSettings(
    storeId: number,
    serverOrigin = 'http://localhost:4000'
  ): Promise<PosIntegrationSettingsDTO> {
    const store = await queryOne<{
      pos_api_key: string | null;
      pos_enabled: boolean;
      pos_last_sync_at: Date | null;
    }>(
      'SELECT pos_api_key, pos_enabled, pos_last_sync_at FROM stores WHERE id = $1',
      [storeId]
    );

    if (!store) {
      throw new NotFoundError('Do\'kon');
    }

    return {
      storeId,
      posApiKey: store.pos_api_key,
      posEnabled: store.pos_enabled,
      lastSyncAt: store.pos_last_sync_at ? store.pos_last_sync_at.toISOString() : null,
      webhookUrl: `${serverOrigin}/api/v1/integrations/pos/sale`,
    };
  }

  /**
   * Yangi xavfsiz POS API kalit generatsiya qilish
   */
  async regeneratePosApiKey(storeId: number): Promise<{ apiKey: string }> {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const newApiKey = `flex_pos_${randomHex}`;

    await query(
      'UPDATE stores SET pos_api_key = $1, pos_enabled = true WHERE id = $2',
      [newApiKey, storeId]
    );

    logger.info('PosService', `🔑 Do'kon ${storeId} uchun yangi POS API kalit yaratildi`);

    return { apiKey: newApiKey };
  }

  /**
   * POS integratsiyasini yoqish yoki o'chirish
   */
  async togglePos(storeId: number, enabled: boolean): Promise<boolean> {
    await query(
      'UPDATE stores SET pos_enabled = $1 WHERE id = $2',
      [enabled, storeId]
    );
    return enabled;
  }
}
