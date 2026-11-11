import fs from 'fs';
import path from 'path';

/**
 * FLEX Sync Agent — 1C va lokal kassa kompyuterlari uchun sinxronizatsiya mini-dasturi.
 * Mahalliy fayldan (JSON yoki CSV) qoldiqlarni o'qib, FLEX serveriga muntazam yuborib turadi.
 */

interface AgentConfig {
  serverUrl: string;
  apiKey: string;
  filePath: string;
  intervalSeconds: number;
  once: boolean;
}

interface StockItem {
  barcode?: string;
  sku?: string;
  productId?: number;
  stockQuantity: number;
  price?: number;
}

function parseArgs(): AgentConfig {
  const args = process.argv.slice(2);
  const config: AgentConfig = {
    serverUrl: process.env.FLEX_SERVER_URL || 'http://localhost:4000',
    apiKey: process.env.FLEX_POS_KEY || '',
    filePath: process.env.FLEX_STOCK_FILE || './stock.json',
    intervalSeconds: Number(process.env.FLEX_SYNC_INTERVAL) || 60,
    once: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--url=')) config.serverUrl = arg.slice(6).replace(/\/$/, '');
    if (arg.startsWith('--key=')) config.apiKey = arg.slice(6);
    if (arg.startsWith('--file=')) config.filePath = arg.slice(7);
    if (arg.startsWith('--interval=')) config.intervalSeconds = Number(arg.slice(11)) || 60;
    if (arg === '--once') config.once = true;
  }

  return config;
}

function parseStockFile(filePath: string): StockItem[] {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Sinxronizatsiya fayli topilmadi: ${resolved}`);
  }

  const content = fs.readFileSync(resolved, 'utf-8').trim();
  if (!content) return [];

  // 1. JSON format
  if (resolved.endsWith('.json') || content.startsWith('[') || content.startsWith('{')) {
    const raw = JSON.parse(content);
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((item) => ({
      barcode: item.barcode ? String(item.barcode).trim() : undefined,
      sku: item.sku ? String(item.sku).trim() : undefined,
      productId: item.productId ? Number(item.productId) : undefined,
      stockQuantity: Math.max(0, parseInt(String(item.stockQuantity || item.qoldiq || item.stock || 0), 10)),
      price: item.price ? parseInt(String(item.price), 10) : undefined,
    }));
  }

  // 2. CSV / TSV format (barcode,stockQuantity,price)
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const delimiter = lines[0]?.includes('\t') ? '\t' : lines[0]?.includes(';') ? ';' : ',';
  const startIndex = lines[0]?.toLowerCase().includes('barcode') || lines[0]?.toLowerCase().includes('shtrix') ? 1 : 0;

  const items: StockItem[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const parts = (lines[i] || '').split(delimiter).map((p) => p.trim());
    const barcode = parts[0];
    const rawStock = parts[1];
    const rawPrice = parts[2];

    if (barcode && rawStock !== undefined) {
      items.push({
        barcode,
        stockQuantity: Math.max(0, parseInt(rawStock.replace(/\D/g, ''), 10) || 0),
        price: rawPrice ? parseInt(rawPrice.replace(/\D/g, ''), 10) : undefined,
      });
    }
  }

  return items;
}

let lastContentHash = '';

async function syncOnce(config: AgentConfig): Promise<void> {
  const timestamp = new Date().toLocaleTimeString('uz-UZ');

  try {
    const items = parseStockFile(config.filePath);

    if (items.length === 0) {
      console.log(`[${timestamp}] ⚠️ Fayl bo'sh, yuborish o'tkazib yuborildi.`);
      return;
    }

    const currentHash = JSON.stringify(items);
    if (currentHash === lastContentHash && !config.once) {
      console.log(`[${timestamp}] ℹ️ O'zgarish yo'q, yangilanish talab etilmaydi (${items.length} ta tovar).`);
      return;
    }

    console.log(`[${timestamp}] 🚀 Serverga sinxronizatsiya yuborilmoqda: ${items.length} ta tovar...`);

    const response = await fetch(`${config.serverUrl}/api/v1/integrations/pos/stock-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-POS-Api-Key': config.apiKey,
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(`Server xatosi (${response.status}): ${JSON.stringify(errJson)}`);
    }

    const result = (await response.json()) as {
      success: boolean;
      data: { updatedCount: number; notFoundBarcodes: string[] };
    };

    lastContentHash = currentHash;
    console.log(`[${timestamp}] ✅ Sinxronizatsiya muvaffaqiyatli! Serverda ${result.data.updatedCount} ta tovar yangilandi.`);
    if (result.data.notFoundBarcodes.length > 0) {
      console.log(`[${timestamp}] ℹ️ Serverda topilmagan shtrix-kodlar (${result.data.notFoundBarcodes.length} ta): ${result.data.notFoundBarcodes.slice(0, 5).join(', ')}...`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Noma\'lum xato';
    console.error(`[${timestamp}] ❌ Xatolik yuz berdi: ${msg}`);
  }
}

async function run() {
  const config = parseArgs();

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║       🤖 FLEX 1C / POS Sync Agent v1.0         ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`🌍 Server:    ${config.serverUrl}`);
  console.log(`📄 Fayl:      ${config.filePath}`);
  console.log(`⏱️ Oraliq:    ${config.intervalSeconds} soniya`);

  if (!config.apiKey) {
    console.error('❌ Xato: POS API kalit kiritilmadi! --key=flex_pos_... yoki FLEX_POS_KEY muhitini belgilang.');
    process.exit(1);
  }

  await syncOnce(config);

  if (config.once) {
    process.exit(0);
  }

  setInterval(() => {
    syncOnce(config);
  }, config.intervalSeconds * 1000);
}

run();
