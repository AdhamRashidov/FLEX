import type { CartEntity, CartItemEntity } from '../entities/cart.entity.js';

export interface ICartRepository {
  getOrCreateCart(storeId: number, customerId: number): Promise<CartEntity>;
  getItems(cartId: number): Promise<CartItemEntity[]>;
  addItem(cartId: number, productId: number, quantity: number): Promise<CartItemEntity>;
  updateItemQuantity(cartId: number, productId: number, quantity: number): Promise<CartItemEntity | null>;
  removeItem(cartId: number, productId: number): Promise<boolean>;
  clearCart(cartId: number): Promise<void>;
}
