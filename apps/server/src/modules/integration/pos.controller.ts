import type { Request, Response } from 'express';
import { PosService } from './pos.service.js';
import {
  posSaleWebhookSchema,
  posStockSyncSchema,
} from '@flex/shared';
import { z } from 'zod';

const togglePosSchema = z.object({
  enabled: z.boolean(),
});

export class PosController {
  private posService: PosService;

  constructor() {
    this.posService = new PosService();
  }

  /**
   * POST /api/v1/integrations/pos/sale
   * Jismoniy kassadan sotuv haqida webhook xabari
   */
  handleSale = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const input = posSaleWebhookSchema.parse(req.body);

    const result = await this.posService.handlePosSale(storeId, input);

    res.json({
      success: true,
      data: result,
    });
  };

  /**
   * POST /api/v1/integrations/pos/stock-sync
   * 1C yoki kassadan tovar qoldiqlari va narxlarini ommaviy sinxronizatsiya qilish
   */
  handleStockSync = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const input = posStockSyncSchema.parse(req.body);

    const result = await this.posService.handleStockSync(storeId, input);

    res.json({
      success: true,
      data: result,
    });
  };

  /**
   * GET /api/v1/store/settings/pos
   * Do'konning POS sozlamalari va API kalitini olish
   */
  getSettings = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const origin = `${req.protocol}://${req.get('host')}`;

    const settings = await this.posService.getPosSettings(storeId, origin);

    res.json({
      success: true,
      data: settings,
    });
  };

  /**
   * POST /api/v1/store/settings/pos/regenerate-key
   * Yangi POS API kalit yaratish
   */
  regenerateKey = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const result = await this.posService.regeneratePosApiKey(storeId);

    res.json({
      success: true,
      data: result,
    });
  };

  /**
   * PATCH /api/v1/store/settings/pos/toggle
   * POS integratsiyasini yoqish / o'chirish
   */
  togglePos = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const { enabled } = togglePosSchema.parse(req.body);

    const isEnabled = await this.posService.togglePos(storeId, enabled);

    res.json({
      success: true,
      data: { enabled: isEnabled },
    });
  };
}
