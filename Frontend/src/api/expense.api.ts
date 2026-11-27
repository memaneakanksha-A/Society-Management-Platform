import api from "./axios";
import type {
  ExpenseCategory,
  ExpenseListResponse,
  Expense,
  IncomeListResponse,
  Income,
  OpeningBalance,
  IncomeExpenseReport,
  ExpenseSummary,
} from "@/types/finance.types";

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const openBlobInNewTab = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------- Categories ----------

export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const { data } = await api.get("/admin/expense-categories");
  return (data.categories as ExpenseCategory[]) || [];
};

export const createExpenseCategory = async (payload: {
  name: string;
  isActive?: boolean;
}): Promise<ExpenseCategory> => {
  const { data } = await api.post("/admin/expense-categories", payload);
  return data.category as ExpenseCategory;
};

export const updateExpenseCategory = async (
  id: string,
  payload: { name?: string; isActive?: boolean }
): Promise<ExpenseCategory> => {
  const { data } = await api.put(`/admin/expense-categories/${id}`, payload);
  return data.category as ExpenseCategory;
};

export const deleteExpenseCategory = async (id: string): Promise<void> => {
  await api.delete(`/admin/expense-categories/${id}`);
};

// ---------- Expenses ----------

export interface ExpenseQuery {
  from?: string;
  to?: string;
  categoryId?: string;
  mode?: string;
  search?: string;
  petty?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

export const getExpenses = async (query: ExpenseQuery): Promise<ExpenseListResponse> => {
  const { data } = await api.get("/admin/expenses", { params: query });
  return data as ExpenseListResponse;
};

export const createExpense = async (formData: FormData): Promise<Expense> => {
  const { data } = await api.post("/admin/expenses", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.expense as Expense;
};

export const updateExpense = async (id: string, formData: FormData): Promise<Expense> => {
  const { data } = await api.put(`/admin/expenses/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.expense as Expense;
};

export const cancelExpense = async (id: string, reason: string): Promise<Expense> => {
  const { data } = await api.post(`/admin/expenses/${id}/cancel`, { reason });
  return data.expense as Expense;
};

export const getExpenseAttachmentBlob = async (id: string): Promise<Blob> => {
  const { data } = await api.get(`/admin/expenses/${id}/attachment`, { responseType: "blob" });
  return data as Blob;
};

export const getExpenseVoucherBlob = async (id: string): Promise<Blob> => {
  const { data } = await api.get(`/admin/expenses/${id}/voucher`, { responseType: "blob" });
  return data as Blob;
};

// ---------- Income ----------

export interface IncomeQuery {
  from?: string;
  to?: string;
  source?: string;
  mode?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const getIncomes = async (query: IncomeQuery): Promise<IncomeListResponse> => {
  const { data } = await api.get("/admin/incomes", { params: query });
  return data as IncomeListResponse;
};

export interface IncomePayload {
  date?: string;
  source: string;
  title: string;
  amount: number;
  mode: string;
  referenceNo?: string;
  receivedFrom?: string;
  remarks?: string;
}

export const createIncome = async (payload: IncomePayload): Promise<Income> => {
  const { data } = await api.post("/admin/incomes", payload);
  return data.income as Income;
};

export const updateIncome = async (id: string, payload: Partial<IncomePayload>): Promise<Income> => {
  const { data } = await api.put(`/admin/incomes/${id}`, payload);
  return data.income as Income;
};

export const cancelIncome = async (id: string, reason: string): Promise<Income> => {
  const { data } = await api.post(`/admin/incomes/${id}/cancel`, { reason });
  return data.income as Income;
};

// ---------- Finance ----------

export const getOpeningBalance = async (year: number): Promise<OpeningBalance> => {
  const { data } = await api.get("/admin/finance/opening-balance", { params: { year } });
  return data as OpeningBalance;
};

export const updateOpeningBalance = async (
  year: number,
  payload: { openingCash: number; openingBank: number }
): Promise<OpeningBalance> => {
  const { data } = await api.put("/admin/finance/opening-balance", { year, ...payload });
  return data.setting as OpeningBalance;
};

export const getIncomeExpenseReport = async (params: {
  year?: number;
  from?: string;
  to?: string;
  period?: string;
  month?: number;
  quarter?: number;
}): Promise<IncomeExpenseReport> => {
  const { data } = await api.get("/admin/reports/income-expense", { params });
  return data.report as IncomeExpenseReport;
};

export const getExpensesSummary = async (params: {
  from?: string;
  to?: string;
  year?: number;
  period?: string;
  month?: number;
  quarter?: number;
}): Promise<ExpenseSummary> => {
  const { data } = await api.get("/admin/reports/expenses-summary", { params });
  return data.summary as ExpenseSummary;
};