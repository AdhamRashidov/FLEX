import type { Request, Response } from 'express';
import { StoreService } from './store.service.js';
import type { CreateStoreInput, UpdateStoreInput } from './store.validation.js';

export class StoreController {
  private storeService: StoreService;

  constructor() {
    this.storeService = new StoreService();
  }

  /**
   * POST /api/v1/admin/stores
   * Yangi do'kon yaratish
   */
  createStore = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const input = req.body as CreateStoreInput;
    const store = await this.storeService.createStore(user.id, input);

    res.status(201).json({
      success: true,
      data: store,
    });
  };

  /**
   * GET /api/v1/store/profile
   * Do'kon egasining do'konlarini olish
   */
  getMyStores = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const stores = await this.storeService.getOwnerStores(user.id);

    res.json({
      success: true,
      data: stores,
    });
  };

  /**
   * PATCH /api/v1/store/:storeId
   * Do'kon sozlamalarini yangilash
   */
  updateStore = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const rawStoreId = req.params.storeId;
    const storeIdStr = Array.isArray(rawStoreId) ? rawStoreId[0] : rawStoreId;
    const storeId = parseInt(storeIdStr ?? '0', 10);
    const input = req.body as UpdateStoreInput;

    const updated = await this.storeService.updateStore(storeId, user.id, input);

    res.json({
      success: true,
      data: updated,
    });
  };

  /**
   * GET /api/v1/shop/:storeSlug/info
   * Xaridor uchun ommaviy do'kon ma'lumotlari
   */
  getPublicInfo = async (req: Request, res: Response): Promise<void> => {
    const rawSlug = req.params.storeSlug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    if (!slug) {
      res.status(400).json({ success: false, error: { code: 'INVALID_PARAM', message: 'Do\'kon slugi ko\'rsatilmadi' } });
      return;
    }

    const store = await this.storeService.getPublicStoreInfo(slug);

    res.json({
      success: true,
      data: store,
    });
  };

  /**
   * GET /api/v1/admin/stores
   * Barcha do'konlar ro'yxati (Super Admin)
   */
  listAllStores = async (req: Request, res: Response): Promise<void> => {
    const rawPage = req.query.page;
    const pageStr = Array.isArray(rawPage) ? rawPage[0] : rawPage;
    const page = parseInt(typeof pageStr === 'string' ? pageStr : '1', 10);

    const rawLimit = req.query.limit;
    const limitStr = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
    const limit = parseInt(typeof limitStr === 'string' ? limitStr : '20', 10);

    const result = await this.storeService.listAllStores(page, limit);

    res.json({
      success: true,
      data: result.stores,
      meta: {
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  };
}
