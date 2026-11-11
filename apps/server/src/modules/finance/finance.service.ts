import { PgFinanceRepository } from '../../infrastructure/repositories/pg-finance.repository.js';
import { NotFoundError } from '../../common/errors/index.js';
import type {
  TransactionDTO,
  FinanceSummaryDTO,
  SalesChartPointDTO,
  TopProductDTO,
  CategorySalesDTO,
  CreateTransactionInput,
  TransactionFilterInput,
  SalesReportQueryInput,
  TopProductsQueryInput,
} from '@flex/shared';
import type { TransactionEntity } from '../../core/entities/transaction.entity.js';

function mapEntityToDTO(entity: TransactionEntity): TransactionDTO {
  return {
    id: entity.id,
    storeId: entity.storeId,
    orderId: entity.orderId,
    type: entity.type,
    category: entity.category,
    amount: entity.amount,
    description: entity.description,
    createdAt: entity.createdAt.toISOString(),
  };
}

export class FinanceService {
  private financeRepo: PgFinanceRepository;

  constructor() {
    this.financeRepo = new PgFinanceRepository();
  }

  /**
   * Umumiy moliya xulosasi (balans, bugungi/oylik tushum, xarajatlar)
   */
  async getSummary(storeId: number): Promise<FinanceSummaryDTO> {
    const summary = await this.financeRepo.getSummary(storeId);
    return summary;
  }

  /**
   * Tranzaksiyalar ro'yxatini filtrlash va paginatsiya bilan olish
   */
  async getTransactions(
    storeId: number,
    filter: TransactionFilterInput
  ): Promise<{
    transactions: TransactionDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
    const endDate = filter.endDate ? new Date(filter.endDate) : undefined;

    const { transactions, total } = await this.financeRepo.findMany(storeId, {
      type: filter.type,
      category: filter.category,
      startDate,
      endDate,
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      transactions: transactions.map(mapEntityToDTO),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Yangi moliyaviy tranzaksiya kiritish (Kirim yoki Chiqim)
   */
  async createTransaction(
    storeId: number,
    input: CreateTransactionInput
  ): Promise<TransactionDTO> {
    const transaction = await this.financeRepo.create(storeId, {
      orderId: input.orderId,
      type: input.type,
      category: input.category,
      amount: input.amount,
      description: input.description,
    });

    return mapEntityToDTO(transaction);
  }

  /**
   * Bitta tranzaksiyani ID bo'yicha olish
   */
  async getTransactionById(storeId: number, id: number): Promise<TransactionDTO> {
    const transaction = await this.financeRepo.findById(storeId, id);
    if (!transaction) {
      throw new NotFoundError('Tranzaksiya');
    }
    return mapEntityToDTO(transaction);
  }

  /**
   * Sotuvlar va tushumlar hisoboti (Grafiklar uchun vaqt bo'yicha seriyalar)
   */
  async getSalesReport(
    storeId: number,
    query: SalesReportQueryInput
  ): Promise<SalesChartPointDTO[]> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.financeRepo.getSalesReport(storeId, {
      period: query.period,
      startDate,
      endDate,
    });
  }

  /**
   * Eng ko'p sotilgan tovarlar hisoboti
   */
  async getTopProducts(
    storeId: number,
    query: TopProductsQueryInput
  ): Promise<TopProductDTO[]> {
    const limit = query.limit ?? 10;
    return this.financeRepo.getTopProducts(storeId, query.period, limit);
  }

  /**
   * Kategoriyalar bo'yicha sotuv ulushi hisoboti
   */
  async getCategorySales(
    storeId: number,
    period: 'today' | 'week' | 'month' | 'year' | 'all' = 'month'
  ): Promise<CategorySalesDTO[]> {
    return this.financeRepo.getCategorySales(storeId, period);
  }
}
