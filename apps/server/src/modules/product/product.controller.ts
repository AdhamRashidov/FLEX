import type { Request, Response } from 'express';
import { ProductService } from './product.service.js';
import type { CreateProductInput } from '@flex/shared';
import type {
  UpdateProductInput,
  ProductFilterInput,
  UpdateStockInput,
  AddProductImageInput,
} from './product.validation.js';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  private parseId(param: string | string[] | undefined): number {
    const str = Array.isArray(param) ? param[0] : param;
    return parseInt(str ?? '0', 10);
  }

  /**
   * GET /api/v1/store/products
   * Do'kon egasi uchun mahsulotlar ro'yxati (Barcha tovarlar)
   */
  getStoreProducts = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const filter = req.query as unknown as ProductFilterInput;
    const result = await this.productService.getProducts(storeId, filter);

    res.json({
      success: true,
      data: result.products,
      meta: {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      },
    });
  };

  /**
   * GET /api/v1/store/products/:id
   * Bitta mahsulot tafsilotlari
   */
  getStoreProductById = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const productId = this.parseId(req.params.id);
    const product = await this.productService.getProductById(storeId, productId);

    res.json({
      success: true,
      data: product,
    });
  };

  /**
   * POST /api/v1/store/products
   * Yangi mahsulot yaratish
   */
  createProduct = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const input = req.body as CreateProductInput;
    const product = await this.productService.createProduct(storeId, input);

    res.status(201).json({
      success: true,
      data: product,
    });
  };

  /**
   * PATCH /api/v1/store/products/:id
   * Mahsulotni tahrirlash
   */
  updateProduct = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const productId = this.parseId(req.params.id);
    const input = req.body as UpdateProductInput;

    const updated = await this.productService.updateProduct(storeId, productId, input);

    res.json({
      success: true,
      data: updated,
    });
  };

  /**
   * DELETE /api/v1/store/products/:id
   * Mahsulotni o'chirish (avtomatik keraksiz rasmlarni ham tozalaydi)
   */
  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const productId = this.parseId(req.params.id);

    await this.productService.deleteProduct(storeId, productId);

    res.json({
      success: true,
      data: { message: 'Mahsulot muvaffaqiyatli o\'chirildi' },
    });
  };

  /**
   * PATCH /api/v1/store/products/:id/stock
   * Mahsulot qoldig'ini o'zgartirish (+/-)
   */
  updateStock = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const productId = this.parseId(req.params.id);
    const { quantityChange } = req.body as UpdateStockInput;

    const result = await this.productService.updateStock(storeId, productId, quantityChange);

    res.json({
      success: true,
      data: result,
    });
  };

  /**
   * POST /api/v1/store/products/:id/images
   * Mahsulotga rasm biriktirish (Deduplikatsiya bilan)
   */
  addProductImage = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const productId = this.parseId(req.params.id);
    const input = req.body as AddProductImageInput;

    const image = await this.productService.addProductImage(storeId, productId, input);

    res.status(201).json({
      success: true,
      data: image,
    });
  };

  /**
   * DELETE /api/v1/store/products/:id/images/:imageId
   * Mahsulot rasmini o'chirish
   */
  deleteProductImage = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const productId = this.parseId(req.params.id);
    const imageId = this.parseId(req.params.imageId);

    await this.productService.deleteProductImage(storeId, productId, imageId);

    res.json({
      success: true,
      data: { message: 'Rasm muvaffaqiyatli o\'chirildi' },
    });
  };

  /**
   * GET /api/v1/shop/:storeSlug/products
   * Xaridor Mini App uchun mahsulotlar katalogi (Faqat faollar, kesh bilan)
   */
  getShopProducts = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const filter = req.query as unknown as ProductFilterInput;

    const result = await this.productService.getProducts(storeId, {
      ...filter,
      isActive: true, // Xaridor faqat faol tovarlarni ko'radi
    });

    res.json({
      success: true,
      data: result.products,
      meta: {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      },
    });
  };

  /**
   * GET /api/v1/shop/:storeSlug/products/:id
   * Xaridor Mini App uchun mahsulot tafsiloti
   */
  getShopProductById = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const productId = this.parseId(req.params.id);
    const product = await this.productService.getProductById(storeId, productId);

    res.json({
      success: true,
      data: product,
    });
  };
}
