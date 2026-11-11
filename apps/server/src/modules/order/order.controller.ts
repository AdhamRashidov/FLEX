import type { Request, Response } from 'express';
import { OrderService } from './order.service.js';
import { ValidationError } from '../../common/errors/index.js';
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderFilterInput,
  PaginationInput,
} from '@flex/shared';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
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
   * POST /api/v1/shop/:storeSlug/orders
   * Xaridor tomonidan yangi buyurtma yaratish
   */
  createOrder = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const userId = req.user?.id;
    const input = req.body as CreateOrderInput;

    const order = await this.orderService.createOrder(storeId, input, userId);

    res.status(201).json({
      success: true,
      data: order,
    });
  };

  /**
   * GET /api/v1/shop/:storeSlug/orders/my
   * Xaridorning o'z buyurtmalari ro'yxati
   */
  getShopMyOrders = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const pagination = req.query as unknown as PaginationInput;

    const result = await this.orderService.getCustomerOrders(storeId, userId, pagination);

    res.json({
      success: true,
      data: result.orders,
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
   * GET /api/v1/shop/:storeSlug/orders/:id
   * Xaridor uchun bitta buyurtma tafsilotlari
   */
  getShopOrderById = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const orderId = this.parseId(req.params.id);

    const order = await this.orderService.getOrderById(storeId, orderId);

    res.json({
      success: true,
      data: order,
    });
  };

  /**
   * GET /api/v1/store/orders
   * Do'kon egasi uchun barcha buyurtmalar ro'yxati (filtrlash bilan)
   */
  getStoreOrders = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const filter = req.query as unknown as OrderFilterInput;

    const result = await this.orderService.getStoreOrders(storeId, filter);

    res.json({
      success: true,
      data: result.orders,
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
   * GET /api/v1/store/orders/:id
   * Do'kon egasi uchun buyurtma tafsilotlari
   */
  getStoreOrderById = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const orderId = this.parseId(req.params.id);

    const order = await this.orderService.getOrderById(storeId, orderId);

    res.json({
      success: true,
      data: order,
    });
  };

  /**
   * PATCH /api/v1/store/orders/:id/status
   * Do'kon egasi tomonidan buyurtma statusini o'zgartirish
   */
  updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const orderId = this.parseId(req.params.id);
    const input = req.body as UpdateOrderStatusInput;

    const updated = await this.orderService.updateOrderStatus(storeId, orderId, input);

    res.json({
      success: true,
      data: updated,
    });
  };
}
