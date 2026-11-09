import type { StoreEntity } from '../entities/store.entity.js';
import type { StoreStatus } from '@flex/shared';

export interface CreateStoreData {
  ownerId: number;
  name: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  botToken: string;
  botUsername?: string | null;
  webappUrl?: string | null;
  deliveryEnabled?: boolean;
  deliveryRadiusKm?: number;
  deliveryPrice?: number;
  minOrderAmount?: number;
}

export interface IStoreRepository {
  findById(id: number): Promise<StoreEntity | null>;
  findBySlug(slug: string): Promise<StoreEntity | null>;
  findByBotToken(botToken: string): Promise<StoreEntity | null>;
  findByOwnerId(ownerId: number): Promise<StoreEntity[]>;
  create(data: CreateStoreData): Promise<StoreEntity>;
  update(id: number, data: Partial<CreateStoreData & { status: StoreStatus; logoUrl: string | null }>): Promise<StoreEntity | null>;
  listAll(limit?: number, offset?: number): Promise<{ stores: StoreEntity[]; total: number }>;
}
