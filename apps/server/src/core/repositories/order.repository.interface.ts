import type { OrderEntity } from '../entities/order.entity.js';
import type { OrderStatus, PaymentMethod, PaymentStatus, DeliveryType } from '@flex/shared';

export interface CreateOrderParams {
  storeId: number;
  customerId: number;
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  customerNote?: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: Array<{
    productId: number;
    productName: string;
    productPrice: number;
    quantity: number;
    total: number;
  }>;
}

export interface OrderFilter {
  status?: OrderStatus;
  customerId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface IOrderRepository {
  findById(storeId: number, id: number): Promise<OrderEntity | null>;
  findByOrderNumber(storeId: number, orderNumber: number): Promise<OrderEntity | null>;
  findMany(storeId: number, filter?: OrderFilter): Promise<{ orders: OrderEntity[]; total: number }>;
  findByCustomer(storeId: number, customerId: number, limit?: number, offset?: number): Promise<OrderEntity[]>;
  createWithItems(params: CreateOrderParams): Promise<OrderEntity>;
  updateStatus(storeId: number, id: number, status: OrderStatus, cancelReason?: string): Promise<OrderEntity | null>;
  updatePaymentStatus(storeId: number, id: number, status: PaymentStatus, proofUrl?: string): Promise<OrderEntity | null>;
  getNextOrderNumber(storeId: number): Promise<number>;
}
