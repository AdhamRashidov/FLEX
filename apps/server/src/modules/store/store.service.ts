import { PgStoreRepository } from '../../infrastructure/repositories/pg-store.repository.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../../common/errors/index.js';
import type { CreateStoreInput, UpdateStoreInput } from './store.validation.js';
import type { StoreDTO } from '@flex/shared';
import type { StoreEntity } from '../../core/entities/store.entity.js';

function toStoreDto(entity: StoreEntity): StoreDTO {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    description: entity.description ?? null,
    logoUrl: entity.logoUrl ?? null,
    phone: entity.phone ?? null,
    status: entity.status,
    deliveryEnabled: entity.deliveryEnabled,
    deliveryRadiusKm: entity.deliveryRadiusKm,
    deliveryPrice: entity.deliveryPrice,
    minOrderAmount: entity.minOrderAmount,
    paymentCardNumber: entity.paymentCardNumber ?? null,
    createdAt: entity.createdAt.toISOString(),
  };
}

export class StoreService {
  private storeRepo: PgStoreRepository;

  constructor() {
    this.storeRepo = new PgStoreRepository();
  }

  /**
   * Yangi do'kon (Tenant) yaratish
   */
  async createStore(ownerId: number, input: CreateStoreInput): Promise<StoreDTO> {
    // 1. Slug band emasligini tekshirish
    const existingSlug = await this.storeRepo.findBySlug(input.slug);
    if (existingSlug) {
      throw new ConflictError(`"${input.slug}" slugi band. Boshqa nom tanlang`);
    }

    // 2. Bot tokeni band emasligini tekshirish
    const existingBot = await this.storeRepo.findByBotToken(input.botToken);
    if (existingBot) {
      throw new ConflictError('Ushbu bot tokeni allaqachon boshqa do\'konga ulangan');
    }

    // 3. Do'konni yaratish
    const store = await this.storeRepo.create({
      ownerId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      phone: input.phone ?? null,
      botToken: input.botToken,
      botUsername: input.botUsername ?? null,
      webappUrl: input.webappUrl ?? null,
      deliveryEnabled: input.deliveryEnabled,
      deliveryRadiusKm: input.deliveryRadiusKm,
      deliveryPrice: input.deliveryPrice,
      minOrderAmount: input.minOrderAmount,
    });

    return toStoreDto(store);
  }

  /**
   * Slug bo'yicha do'kon ma'lumotlarini olish (Xaridor uchun ommaviy)
   */
  async getPublicStoreInfo(slug: string): Promise<StoreDTO> {
    const store = await this.storeRepo.findBySlug(slug);
    if (!store) {
      throw new NotFoundError(`Do'kon (${slug})`);
    }

    if (store.status === 'suspended' || store.status === 'inactive') {
      throw new ForbiddenError('Ushbu do\'kon hozirda faol emas');
    }

    return toStoreDto(store);
  }

  /**
   * Foydalanuvchining o'z do'konlari ro'yxatini olish
   */
  async getOwnerStores(ownerId: number): Promise<StoreDTO[]> {
    const stores = await this.storeRepo.findByOwnerId(ownerId);
    return stores.map(toStoreDto);
  }

  /**
   * ID bo'yicha do'kon ma'lumotlarini olish (Boshqaruv paneli uchun)
   */
  async getStoreById(storeId: number, userId: number): Promise<StoreDTO> {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError('Do\'kon');
    }

    if (store.ownerId !== userId) {
      throw new ForbiddenError('Siz ushbu do\'konning egasi emassiz');
    }

    return toStoreDto(store);
  }

  /**
   * Do'kon sozlamalarini yangilash
   */
  async updateStore(storeId: number, userId: number, input: UpdateStoreInput): Promise<StoreDTO> {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError('Do\'kon');
    }

    if (store.ownerId !== userId) {
      throw new ForbiddenError('Siz ushbu do\'konni tahrirlash huquqiga ega emassiz');
    }

    // Agar slug o'zgartirilayotgan bo'lsa, band emasligini tekshirish
    if (input.slug && input.slug !== store.slug) {
      const existing = await this.storeRepo.findBySlug(input.slug);
      if (existing) {
        throw new ConflictError(`"${input.slug}" slugi band`);
      }
    }

    const updated = await this.storeRepo.update(storeId, input);
    if (!updated) {
      throw new NotFoundError('Do\'kon yangilanmadi');
    }

    return toStoreDto(updated);
  }

  /**
   * Barcha do'konlarni ro'yxati (Super Admin uchun)
   */
  async listAllStores(page = 1, limit = 20): Promise<{ stores: StoreDTO[]; total: number }> {
    const offset = (page - 1) * limit;
    const { stores, total } = await this.storeRepo.listAll(limit, offset);
    return {
      stores: stores.map(toStoreDto),
      total,
    };
  }
}
