import { PgProductRepository } from '../../infrastructure/repositories/pg-product.repository.js';
import { mediaStorageService } from '../../infrastructure/storage/media-storage.service.js';
import { cacheService } from '../../infrastructure/cache/redis.js';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import type { CreateProductInput, ProductDTO, ProductImageDTO } from '@flex/shared';
import type {
  UpdateProductInput,
  ProductFilterInput,
  AddProductImageInput,
} from './product.validation.js';
import type { ProductEntity, ProductImageEntity } from '../../core/entities/product.entity.js';

function toImageDto(img: ProductImageEntity): ProductImageDTO {
  return {
    id: img.id,
    url: img.url,
    isPrimary: img.isPrimary,
  };
}

function toProductDto(entity: ProductEntity): ProductDTO {
  return {
    id: entity.id,
    storeId: entity.storeId,
    categoryId: entity.categoryId ?? null,
    name: entity.name,
    description: entity.description ?? null,
    barcode: entity.barcode ?? null,
    price: entity.price,
    oldPrice: entity.oldPrice ?? null,
    unit: entity.unit,
    stockQuantity: entity.stockQuantity,
    trackStock: entity.trackStock,
    isActive: entity.isActive,
    images: (entity.images ?? []).map(toImageDto),
    createdAt: entity.createdAt.toISOString(),
  };
}

export class ProductService {
  private productRepo: PgProductRepository;

  constructor() {
    this.productRepo = new PgProductRepository();
  }

  private async invalidateStoreCache(storeId: number): Promise<void> {
    await cacheService.delPattern(`store:${storeId}:products:*`);
  }

  /**
   * Mahsulotlar ro'yxatini olish (Filter, Search, Pagination va Kesh bilan)
   */
  async getProducts(
    storeId: number,
    filter: ProductFilterInput
  ): Promise<{ products: ProductDTO[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    // Faqat ommaviy filtrlangan (search bo'lmagan) sahifalarni keshlaymiz
    const isCacheable = !filter.search && filter.isActive === true;
    const cacheKey = `store:${storeId}:products:cat_${filter.categoryId ?? 'all'}:p_${page}:l_${limit}`;

    if (isCacheable) {
      const cached = await cacheService.get<{ products: ProductDTO[]; total: number }>(cacheKey);
      if (cached) {
        return { ...cached, page, limit };
      }
    }

    const { products, total } = await this.productRepo.findMany(storeId, {
      ...filter,
      offset,
      limit,
    });

    const result = {
      products: products.map(toProductDto),
      total,
      page,
      limit,
    };

    if (isCacheable) {
      await cacheService.set(cacheKey, { products: result.products, total }, 300); // 5 daqiqa
    }

    return result;
  }

  /**
   * ID bo'yicha mahsulotni olish
   */
  async getProductById(storeId: number, productId: number): Promise<ProductDTO> {
    const product = await this.productRepo.findById(storeId, productId);
    if (!product) {
      throw new NotFoundError('Mahsulot');
    }
    return toProductDto(product);
  }

  /**
   * Yangi mahsulot yaratish
   */
  async createProduct(storeId: number, input: CreateProductInput): Promise<ProductDTO> {
    // Agar shtrix-kod ko'rsatilgan bo'lsa, ushbu do'konda takrorlanmasligini tekshirish
    if (input.barcode) {
      const existing = await this.productRepo.findByBarcode(storeId, input.barcode);
      if (existing) {
        throw new ConflictError(`"${input.barcode}" shtrix-kodli mahsulot allaqachon mavjud`);
      }
    }

    const created = await this.productRepo.create(storeId, input);
    await this.invalidateStoreCache(storeId);
    return toProductDto(created);
  }

  /**
   * Mahsulotni yangilash
   */
  async updateProduct(
    storeId: number,
    productId: number,
    input: UpdateProductInput
  ): Promise<ProductDTO> {
    const product = await this.productRepo.findById(storeId, productId);
    if (!product) {
      throw new NotFoundError('Mahsulot');
    }

    if (input.barcode && input.barcode !== product.barcode) {
      const existing = await this.productRepo.findByBarcode(storeId, input.barcode);
      if (existing) {
        throw new ConflictError(`"${input.barcode}" shtrix-kodli mahsulot mavjud`);
      }
    }

    const updated = await this.productRepo.update(storeId, productId, input);
    if (!updated) {
      throw new NotFoundError('Mahsulot yangilanmadi');
    }

    await this.invalidateStoreCache(storeId);
    return toProductDto(updated);
  }

  /**
   * Mahsulotni o'chirish (Avtomatik rasmlar tozalanishi bilan - DRY Garbage Collection)
   */
  async deleteProduct(storeId: number, productId: number): Promise<void> {
    const product = await this.productRepo.findById(storeId, productId);
    if (!product) {
      throw new NotFoundError('Mahsulot');
    }

    // 1. Mahsulotga ulangan barcha rasmlar URL'larini olamiz
    const imageUrls = (product.images ?? []).map((img) => img.url);

    // 2. Mahsulotni bazadan o'chiramiz (CASCADE product_images ni ham tozalaydi)
    await this.productRepo.delete(storeId, productId);

    // 3. Rasmlarni MediaStorageService orqali bo'shatamiz
    // Agar rasmga boshqa hech kim ulanmagan bo'lsa, diskdan butunlay yo'q qilinadi
    if (imageUrls.length > 0) {
      await mediaStorageService.releaseMultiple(imageUrls);
    }

    await this.invalidateStoreCache(storeId);
  }

  /**
   * Mahsulot qoldig'ini (Stock) o'zgartirish
   */
  async updateStock(
    storeId: number,
    productId: number,
    quantityChange: number
  ): Promise<{ stockQuantity: number }> {
    const product = await this.productRepo.findById(storeId, productId);
    if (!product) {
      throw new NotFoundError('Mahsulot');
    }

    const newStock = await this.productRepo.updateStock(storeId, productId, quantityChange);
    await this.invalidateStoreCache(storeId);
    return { stockQuantity: newStock };
  }

  /**
   * Mahsulotga rasm yuklash (SHA-256 Deduplikatsiya bilan)
   */
  async addProductImage(
    storeId: number,
    productId: number,
    input: AddProductImageInput
  ): Promise<ProductImageDTO> {
    const product = await this.productRepo.findById(storeId, productId);
    if (!product) {
      throw new NotFoundError('Mahsulot');
    }

    // Base64 dan buferga o'tkazish
    const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Media xizmati orqali rasmni saqlaymiz yoki mavjudini qayta ishlatamiz
    const mediaResult = await mediaStorageService.saveOrReuse(
      buffer,
      input.filename,
      input.mimeType
    );

    // Mahsulotga rasmni biriktiramiz
    const createdImages = await this.productRepo.addImages(storeId, productId, [
      {
        url: mediaResult.url,
        isPrimary: input.isPrimary,
      },
    ]);

    await this.invalidateStoreCache(storeId);
    const firstImg = createdImages[0];
    if (!firstImg) throw new Error('Rasm biriktirib bo\'lmadi');
    return toImageDto(firstImg);
  }

  /**
   * Mahsulot rasmini o'chirish (Avtomatik disk tozalash bilan)
   */
  async deleteProductImage(
    storeId: number,
    productId: number,
    imageId: number
  ): Promise<void> {
    const product = await this.productRepo.findById(storeId, productId);
    if (!product) {
      throw new NotFoundError('Mahsulot');
    }

    const image = (product.images ?? []).find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundError('Rasm');
    }

    // 1. Bazadan rasm bog'lanishini o'chiramiz
    await this.productRepo.deleteImage(storeId, imageId);

    // 2. MediaStorageService orqali resursni bo'shatamiz
    await mediaStorageService.release(image.url);

    await this.invalidateStoreCache(storeId);
  }
}
