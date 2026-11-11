import type { Request, Response } from 'express';
import { SuperService } from './super.service.js';
import { ValidationError } from '../../common/errors/index.js';
import {
  createGlobalCatalogItemSchema,
  updateGlobalCatalogItemSchema,
  updateStoreStatusSchema,
  paginationSchema,
  StoreStatus,
} from '@flex/shared';
import { z } from 'zod';

const storeFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'maintenance']).optional(),
});

const catalogFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
});

const userFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  isSuperAdmin: z.coerce.boolean().optional(),
});

const userRoleSchema = z.object({
  isSuperAdmin: z.boolean(),
});

export class SuperController {
  private superService: SuperService;

  constructor() {
    this.superService = new SuperService();
  }

  private parseId(param: string | string[] | undefined): number {
    const val = Array.isArray(param) ? param[0] : param;
    const id = Number(val);
    if (!val || isNaN(id) || id <= 0) {
      throw new ValidationError('ID to\'g\'ri musbat son bo\'lishi kerak');
    }
    return id;
  }

  /**
   * GET /api/v1/super/dashboard
   */
  getDashboard = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.superService.getDashboard();
    res.json({ success: true, data });
  };

  /**
   * GET /api/v1/super/stores
   */
  listStores = async (req: Request, res: Response): Promise<void> => {
    const filter = storeFilterSchema.parse(req.query);
    const result = await this.superService.listStores({
      search: filter.search,
      status: filter.status as StoreStatus | undefined,
      page: filter.page,
      limit: filter.limit,
    });

    res.json({
      success: true,
      data: result.stores,
      meta: {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    });
  };

  /**
   * GET /api/v1/super/stores/:id
   */
  getStoreDetails = async (req: Request, res: Response): Promise<void> => {
    const id = this.parseId(req.params.id);
    const store = await this.superService.getStoreDetails(id);
    res.json({ success: true, data: store });
  };

  /**
   * PATCH /api/v1/super/stores/:id/status
   */
  updateStoreStatus = async (req: Request, res: Response): Promise<void> => {
    const id = this.parseId(req.params.id);
    const { status } = updateStoreStatusSchema.parse(req.body);
    const result = await this.superService.updateStoreStatus(id, status as StoreStatus);
    res.json({ success: true, data: result });
  };

  /**
   * GET /api/v1/super/catalog
   */
  listCatalog = async (req: Request, res: Response): Promise<void> => {
    const filter = catalogFilterSchema.parse(req.query);
    const result = await this.superService.listGlobalCatalog(filter);

    res.json({
      success: true,
      data: result.items,
      meta: {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    });
  };

  /**
   * POST /api/v1/super/catalog
   */
  createCatalogItem = async (req: Request, res: Response): Promise<void> => {
    const input = createGlobalCatalogItemSchema.parse(req.body);
    const item = await this.superService.createGlobalCatalogItem(input);
    res.status(201).json({ success: true, data: item });
  };

  /**
   * PATCH /api/v1/super/catalog/:id
   */
  updateCatalogItem = async (req: Request, res: Response): Promise<void> => {
    const id = this.parseId(req.params.id);
    const input = updateGlobalCatalogItemSchema.parse(req.body);
    const item = await this.superService.updateGlobalCatalogItem(id, input);
    res.json({ success: true, data: item });
  };

  /**
   * DELETE /api/v1/super/catalog/:id
   */
  deleteCatalogItem = async (req: Request, res: Response): Promise<void> => {
    const id = this.parseId(req.params.id);
    const result = await this.superService.deleteGlobalCatalogItem(id);
    res.json({ success: true, data: result });
  };

  /**
   * GET /api/v1/super/users
   */
  listUsers = async (req: Request, res: Response): Promise<void> => {
    const filter = userFilterSchema.parse(req.query);
    const result = await this.superService.listUsers(filter);

    res.json({
      success: true,
      data: result.users,
      meta: {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    });
  };

  /**
   * PATCH /api/v1/super/users/:id/role
   */
  setUserSuperAdmin = async (req: Request, res: Response): Promise<void> => {
    const id = this.parseId(req.params.id);
    const { isSuperAdmin } = userRoleSchema.parse(req.body);
    const result = await this.superService.setUserSuperAdmin(id, isSuperAdmin);
    res.json({ success: true, data: result });
  };
}
