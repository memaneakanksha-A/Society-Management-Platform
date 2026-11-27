import api from "./axios";
import type {
  MaintenanceConfig,
  DuesListResponse,
  GenerateResult,
  MaintenanceDue,
  HouseLedgerResponse,
  LedgerYearSummary,
  ShareListResponse,
  ShareRecord,
  PendingResponse,
  Defaulter,
  CollectionResponse,
  TopPayer,
} from "@/types/maintenance.types";

export const getMaintenanceConfig = async (year: number): Promise<MaintenanceConfig | null> => {
  const { data } = await api.get("/admin/maintenance/config", { params: { year } });
  return (data.config as MaintenanceConfig) ?? null;
};

export const saveMaintenanceConfig = async (
  payload: Partial<MaintenanceConfig>
): Promise<MaintenanceConfig> => {
  const { data } = await api.put("/admin/maintenance/config", payload);
  return data.config as MaintenanceConfig;
};

export const generateDues = async (year: number): Promise<GenerateResult> => {
  const { data } = await api.post("/admin/maintenance/generate", { year });
  return data as GenerateResult;
};

export interface DueQuery {
  year?: number;
  status?: string;
  typeId?: string;
  houseId?: string;
  search?: string;
  month?: number | "all";
  scope?: "overdue";
  page?: number;
  limit?: number;
}

export const getDues = async (query: DueQuery): Promise<DuesListResponse> => {
  const { data } = await api.get("/admin/maintenance/dues", { params: query });
  return data as DuesListResponse;
};

export const waiveLateFee = async (id: string, reason: string): Promise<MaintenanceDue> => {
  const { data } = await api.post(`/admin/maintenance/dues/${id}/waive-late-fee`, { reason });
  return data.due as MaintenanceDue;
};

export const getHouseLedger = async (houseId: string, year?: number): Promise<HouseLedgerResponse> => {
  const { data } = await api.get(`/admin/houses/${houseId}/ledger`, { params: { year } });
  return data as HouseLedgerResponse;
};

export const getHouseLedgerAll = async (houseId: string): Promise<{ years: LedgerYearSummary[] }> => {
  const { data } = await api.get(`/admin/houses/${houseId}/ledger/all`);
  return data as { years: LedgerYearSummary[] };
};

export interface ShareQuery {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const getShares = async (query: ShareQuery): Promise<ShareListResponse> => {
  const { data } = await api.get("/admin/shares", { params: query });
  return data as ShareListResponse;
};

export const updateShare = async (
  houseId: string,
  payload: Partial<ShareRecord>
): Promise<ShareRecord> => {
  const { data } = await api.put(`/admin/shares/${houseId}`, payload);
  return data.share as ShareRecord;
};

export const bulkInitShares = async (amount: number): Promise<{ created: number; skipped: number }> => {
  const { data } = await api.post("/admin/shares/bulk-init", { amount });
  return data as { created: number; skipped: number };
};

export const getHouseShare = async (houseId: string): Promise<ShareRecord | null> => {
  const { data } = await api.get(`/admin/houses/${houseId}/share`);
  return (data.share as ShareRecord) || null;
};

export interface PeriodParams {
  year?: number;
  period?: string;
  month?: number;
  quarter?: number;
}

export const getPendingReport = async (year: number, extra?: PeriodParams): Promise<PendingResponse> => {
  const { data } = await api.get("/admin/reports/pending", { params: { year, ...extra } });
  return data as PendingResponse;
};

export const getDefaulters = async (
  year: number,
  extra?: PeriodParams
): Promise<{ defaulters: Defaulter[]; total: number; breakdown?: any[]; period?: any }> => {
  const { data } = await api.get("/admin/reports/defaulters", { params: { year, ...extra } });
  return data as { defaulters: Defaulter[]; total: number; breakdown?: any[]; period?: any };
};

export const getCollectionReport = async (
  from?: string,
  to?: string,
  extra?: PeriodParams
): Promise<CollectionResponse> => {
  const { data } = await api.get("/admin/reports/collection", { params: { from, to, ...extra } });
  return data as CollectionResponse;
};

export const getTopPayers = async (
  year: number,
  extra?: PeriodParams
): Promise<{ topPayers: TopPayer[]; total: number; breakdown?: any[]; period?: any }> => {
  const { data } = await api.get("/admin/reports/top-payers", { params: { year, ...extra } });
  return data as { topPayers: TopPayer[]; total: number; breakdown?: any[]; period?: any };
};