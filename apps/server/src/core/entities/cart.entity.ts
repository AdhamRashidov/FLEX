export interface CartItemEntity {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  addedAt: Date;
}

export interface CartEntity {
  id: number;
  storeId: number;
  customerId: number;
  items?: CartItemEntity[];
  updatedAt: Date;
}
