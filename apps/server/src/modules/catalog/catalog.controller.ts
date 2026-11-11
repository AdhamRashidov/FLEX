import type { Request, Response } from 'express';
import { CatalogService } from './catalog.service.js';
import { ValidationError } from '../../common/errors/index.js';
import { z } from 'zod';

const adoptCatalogSchema = z.object({
  price: z.number().int().min(0, 'Narx 0 dan kam bo\'lishi mumkin emas'),
  stockQuantity: z.number().int().min(0).default(0),
  categoryId: z.number().int().positive().optional(),
});

export class CatalogController {
  private catalogService: CatalogService;

  constructor() {
    this.catalogService = new CatalogService();
  }

  /**
   * GET /api/v1/store/catalog/barcode/:barcode
   * Shtrix-kod bo'yicha qidiruv (Skaner)
   */
  lookupBarcode = async (req: Request, res: Response): Promise<void> => {
    const rawBarcode = req.params.barcode;
    const barcode = Array.isArray(rawBarcode) ? rawBarcode[0] : rawBarcode;

    if (!barcode) {
      throw new ValidationError('Shtrix-kod kiritilishi shart');
    }

    const item = await this.catalogService.findByBarcode(barcode);

    res.json({
      success: true,
      data: item,
    });
  };

  /**
   * GET /api/v1/store/catalog/search?q=...
   * Global katalogdan matnli qidiruv
   */
  searchCatalog = async (req: Request, res: Response): Promise<void> => {
    const q = String(req.query.q || '');
    const limit = Number(req.query.limit) || 20;

    const items = await this.catalogService.search(q, limit);

    res.json({
      success: true,
      data: items,
    });
  };

  /**
   * POST /api/v1/store/catalog/adopt/:id
   * Shablon tovardan o'z do'koniga nusxalash
   */
  adoptProduct = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const rawId = req.params.id;
    const catalogId = Number(Array.isArray(rawId) ? rawId[0] : rawId);

    if (!catalogId || isNaN(catalogId)) {
      throw new ValidationError('Katalog ID si to\'g\'ri bo\'lishi shart');
    }

    const parsed = adoptCatalogSchema.parse(req.body);

    const product = await this.catalogService.adoptToStore(storeId, catalogId, parsed);

    res.status(201).json({
      success: true,
      data: product,
    });
  };
}
