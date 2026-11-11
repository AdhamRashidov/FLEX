import type { Request, Response } from 'express';
import { FinanceService } from './finance.service.js';
import { ValidationError } from '../../common/errors/index.js';
import {
  createTransactionSchema,
  transactionFilterSchema,
  salesReportQuerySchema,
  topProductsQuerySchema,
} from '@flex/shared';
import { z } from 'zod';

const categorySalesQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'all']).default('month'),
});

export class FinanceController {
  private financeService: FinanceService;

  constructor() {
    this.financeService = new FinanceService();
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
   * GET /api/v1/store/finance/summary
   * Umumiy moliya balansi, tushumlar, chiqimlar
   */
  getSummary = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const summary = await this.financeService.getSummary(storeId);

    res.json({
      success: true,
      data: summary,
    });
  };

  /**
   * GET /api/v1/store/finance/transactions
   * Tranzaksiyalar ro'yxati (filtrlash va paginatsiya)
   */
  getTransactions = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const filter = transactionFilterSchema.parse(req.query);

    const result = await this.financeService.getTransactions(storeId, filter);

    res.json({
      success: true,
      data: result.transactions,
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
   * POST /api/v1/store/finance/transactions
   * Yangi moliyaviy tranzaksiya kiritish
   */
  createTransaction = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const input = createTransactionSchema.parse(req.body);

    const transaction = await this.financeService.createTransaction(storeId, input);

    res.status(201).json({
      success: true,
      data: transaction,
    });
  };

  /**
   * GET /api/v1/store/finance/transactions/:id
   * Bitta tranzaksiya tafsiloti
   */
  getTransactionById = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const id = this.parseId(req.params.id);

    const transaction = await this.financeService.getTransactionById(storeId, id);

    res.json({
      success: true,
      data: transaction,
    });
  };

  /**
   * GET /api/v1/store/finance/reports/sales
   * Sotuvlar dinamikasi hisoboti (kunlik, haftalik, oylik)
   */
  getSalesReport = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const query = salesReportQuerySchema.parse(req.query);

    const points = await this.financeService.getSalesReport(storeId, query);

    res.json({
      success: true,
      data: points,
    });
  };

  /**
   * GET /api/v1/store/finance/reports/top-products
   * Eng ko'p sotilgan tovarlar hisoboti
   */
  getTopProducts = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const query = topProductsQuerySchema.parse(req.query);

    const topProducts = await this.financeService.getTopProducts(storeId, query);

    res.json({
      success: true,
      data: topProducts,
    });
  };

  /**
   * GET /api/v1/store/finance/reports/categories
   * Kategoriyalar bo'yicha sotuv ulushi
   */
  getCategorySales = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const { period } = categorySalesQuerySchema.parse(req.query);

    const categorySales = await this.financeService.getCategorySales(storeId, period);

    res.json({
      success: true,
      data: categorySales,
    });
  };
}
