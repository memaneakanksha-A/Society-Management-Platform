export type PaymentMode = "cash" | "upi" | "cheque" | "bank_transfer" | "card" | "other";
export type ExpenseStatus = "active" | "cancelled";
export type IncomeSource = "interest" | "hall_rent" | "penalty" | "donation" | "scrap" | "other";

export interface ExpenseCategory {
  _id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Expense {
  _id: string;
  date: string;
  categoryId: string | { _id?: string; name?: string };
  title: string;
  description?: string;
  amount: number;
  paidTo?: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  billNo?: string;
  isPettyCash: boolean;
  attachment?: string;
  voucherNo: string;
  approvedBy?: string;
  status: ExpenseStatus;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  pages: number;
  totals: { amount: number; count: number };
}

export interface Income {
  _id: string;
  date: string;
  source: IncomeSource;
  title: string;
  amount: number;
  mode: PaymentMode;
  referenceNo?: string;
  receivedFrom?: string;
  remarks?: string;
  incomeNo: string;
  status: "active" | "cancelled";
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface IncomeListResponse {
  incomes: Income[];
  total: number;
  page: number;
  pages: number;
  totals: { amount: number; count: number };
}

export interface OpeningBalance {
  year: number;
  openingCash: number;
  openingBank: number;
}

export interface CategoryExpense {
  categoryId: string;
  name: string;
  amount: number;
}

export interface MonthRow {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface BreakdownRow {
  label: string;
  from?: string;
  to?: string;
  total?: number;
  count?: number;
  opening?: number;
  income?: number;
  expenses?: number;
  surplus?: number;
  closingBalance?: number;
}

export interface PeriodInfo {
  period: string;
  label: string;
  month?: number;
  quarter?: number;
}

export interface IncomeExpenseReport {
  year: number;
  period?: PeriodInfo;
  breakdown?: BreakdownRow[];
  range: { from: string; to: string };
  openingBalance: { cash: number; bank: number; total: number };
  income: { maintenance: number; shares: number; other: number; total: number };
  expenses: { total: number; byCategory: CategoryExpense[] };
  net: number;
  closingBalance: number;
  monthWise: MonthRow[];
  cashBank: {
    cash: { income: number; expense: number };
    bank: { income: number; expense: number };
  };
}

export interface ExpenseSummary {
  range: { from: string; to: string };
  period?: PeriodInfo;
  breakdown?: BreakdownRow[];
  total: number;
  count: number;
  byCategory: Array<{ categoryId: string; name: string; amount: number; count: number }>;
  byMonth: Array<{ key: string; label: string; amount: number; count: number }>;
}