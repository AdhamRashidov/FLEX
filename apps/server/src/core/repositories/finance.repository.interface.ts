import type {
  TransactionEntity,
  FinanceSummaryEntity,
  SalesChartPointEntity,
  TopProductEntity,
  CategorySalesEntity,
} from '../entities/transaction.entity.js';
import type { TransactionType } from '@flex/shared';

export interface CreateTransactionParams {
  orderId?: number;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
}

export interface TransactionFilterParams {
  type?: TransactionType;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  offset: number;
}

export interface SalesReportPeriodParams {
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface IFinanceRepository {
  create(storeId: number, params: CreateTransactionParams): Promise<TransactionEntity>;
  findById(storeId: number, id: number): Promise<TransactionEntity | null>;
  findMany(
    storeId: number,
    filter: TransactionFilterParams
  ): Promise<{ transactions: TransactionEntity[]; total: number }>;
  getSummary(storeId: number): Promise<FinanceSummaryEntity>;
  getSalesReport(
    storeId: number,
    params: SalesReportPeriodParams
  ): Promise<SalesChartPointEntity[]>;
  getTopProducts(
    storeId: number,
    period: 'today' | 'week' | 'month' | 'year' | 'all',
    limit: number
  ): Promise<TopProductEntity[]>;
  getCategorySales(
    storeId: number,
    period: 'today' | 'week' | 'month' | 'year' | 'all'
  ): Promise<CategorySalesEntity[]>;
  recordDeliveredOrderIncome(
    storeId: number,
    orderId: number,
    amount: number
  ): Promise<TransactionEntity | null>;
}
