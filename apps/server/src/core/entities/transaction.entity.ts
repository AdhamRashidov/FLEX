import type { TransactionType } from '@flex/shared';

export interface TransactionEntity {
  id: number;
  storeId: number;
  orderId: number | null;
  type: TransactionType;
  category: string;
  amount: number;
  description: string | null;
  createdAt: Date;
}

export interface FinanceSummaryEntity {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  todayIncome: number;
  todayExpense: number;
  todayOrdersCount: number;
  weekIncome: number;
  weekExpense: number;
  monthIncome: number;
  monthExpense: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
}

export interface SalesChartPointEntity {
  date: string;
  ordersCount: number;
  totalSales: number;
  netIncome: number;
  expenses: number;
}

export interface TopProductEntity {
  productId: number;
  productName: string;
  imageUrl: string | null;
  totalQuantity: number;
  totalRevenue: number;
  percentage: number;
}

export interface CategorySalesEntity {
  categoryId: number | null;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  percentage: number;
}
