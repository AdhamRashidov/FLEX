import type { OrderStatus, PaymentMethod, PaymentStatus, DeliveryType } from '@flex/shared';

export interface OrderItemEntity {
  id: number;
  orderId: number;
  productId: number;
  storeId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  total: number;
  createdAt: Date;
}

export interface OrderEntity {
  id: number;
  storeId: number;
  customerId: number;
  customerName?: string | null;
  customerPhone?: string | null;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string | null;
  deliveryType: DeliveryType;
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  customerNote?: string | null;
  cancelReason?: string | null;
  cancelledBy?: 'customer' | 'store' | null;
  confirmedAt?: Date | null;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;
  items?: OrderItemEntity[];
  createdAt: Date;
  updatedAt: Date;
}
