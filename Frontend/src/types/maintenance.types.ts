export type Frequency = "yearly" | "monthly" | "quarterly";
export type LateFeeType = "flat" | "percent";
export type LateFeeRepeat = "once" | "monthly";

export interface LateFeeConfig {
  enabled: boolean;
  type: LateFeeType;
  value: number;
  graceDays: number;
  repeat: LateFeeRepeat;
}

export interface AmountByHouseType {
  houseTypeId: string;
  amount: number;
}

export interface MaintenanceConfig {
  _id?: string;
  year: number;
  frequency: Frequency;
  dueDay?: number;
  dueDate?: string;
  amounts: AmountByHouseType[];
  lateFee: LateFeeConfig;
  shareAmountPerHouse?: number;
}

export type DueStatus = "pending" | "partial" | "paid" | "cancelled";
export type PeriodType = "yearly" | "monthly" | "quarterly";

export interface MaintenanceDue {
  _id: string;
  houseId: string | { _id?: string; houseNo?: string; houseTypeId?: string };
  year: number;
  periodType: PeriodType;
  periodNo: number;
  periodLabel: string;
  amount: number;
  dueDate: string;
  paidPrincipal: number;
  lateFeePaid: number;
  lateFeeWaived: number;
  status: DueStatus;
}

export interface EnrichedDue {
  due: MaintenanceDue;
  houseNo: string;
  ownerName: string | null;
  lateFee: number;
  outstanding: number;
}

export interface DuesListResponse {
  dues: EnrichedDue[];
  total: number;
  page: number;
  pages: number;
  summary?: { totalBilled: number; collected: number; pending: number; lateFee: number };
}

export interface GenerateResult {
  created: number;
  skipped: number;
  skippedHouses: string[];
  advanceApplied: number;
}

export type PaymentMode = "cash" | "upi" | "cheque" | "bank_transfer" | "card" | "other";
export type PaymentKind = "maintenance" | "share" | "other";

export interface Allocation {
  dueId: string;
  principal: number;
  lateFee: number;
  paidOn: string;
}

export interface Payment {
  _id: string;
  houseId: string | { _id?: string; houseNo?: string };
  kind: PaymentKind;
  amount: number;
  mode: PaymentMode;
  transactionId?: string;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  paidOn: string;
  paidBy: "owner" | "tenant";
  payerName?: string;
  payerPhone?: string;
  receiptNo: string;
  allocations: Allocation[];
  unallocated: number;
  isAdvance: boolean;
  remarks?: string;
  status: "active" | "cancelled";
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  pages: number;
}

export interface PaymentInput {
  houseId: string;
  kind?: PaymentKind;
  amount: number;
  mode: PaymentMode;
  transactionId?: string;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  paidOn?: string;
  paidBy: "owner" | "tenant";
  payerName?: string;
  payerPhone?: string;
  remarks?: string;
  dueIds?: string[];
}

export type ShareStatus = "pending" | "partial" | "paid";

export interface ShareRecord {
  _id: string;
  houseId: string | { _id?: string; houseNo?: string };
  houseNo?: string;
  houseTypeCode?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  totalAmount: number;
  paidAmount: number;
  pendingAmount?: number;
  status: ShareStatus;
  certificateNo?: string | null;
  issueDate?: string | null;
  remarks?: string;
}

export interface ShareListResponse {
  shares: ShareRecord[];
  total: number;
  page: number;
  pages: number;
  stats: {
    totalAmount: number;
    paid: number;
    pending: number;
    counts: { total: number; paid: number; pending: number; partial: number };
  };
}

export interface LedgerSummary {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  advanceCredit: number;
}

export interface HouseLedgerResponse {
  dues: MaintenanceDue[];
  payments: Payment[];
  summary: LedgerSummary;
  financialYear?: string;
}

export interface LedgerYearSummary {
  year: number;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
}

export interface TopPayer {
  rank: number;
  houseId: string;
  houseNo: string;
  owner: string | null;
  score: number;
  paidOnTimeCount: number;
  advanceCount: number;
  lateCount: number;
}

export interface Defaulter {
  houseId: string;
  houseNo: string;
  owner: string | null;
  phone: string | null;
  overduePeriods: number;
  principalPending: number;
  lateFee: number;
  oldestDueDate: string;
}

export interface PendingItem {
  due: MaintenanceDue;
  houseNo: string;
  owner: string | null;
  phone: string | null;
  outstanding: number;
  lateFee: number;
}

export interface PendingResponse {
  dues: PendingItem[];
  total: number;
  summary: { count: number; totalOutstanding: number };
  period?: PeriodInfo;
  breakdown?: BreakdownRow[];
}

export interface BreakdownRow {
  label: string;
  from?: string;
  to?: string;
  total?: number;
  count?: number;
  totalOutstanding?: number;
  principalPending?: number;
  lateFee?: number;
  income?: number;
  expenses?: number;
  surplus?: number;
  opening?: number;
  closingBalance?: number;
  byMode?: Record<string, number>;
  byType?: Record<string, number>;
}

export interface PeriodInfo {
  period: string;
  label: string;
  month?: number;
  quarter?: number;
}

export interface CollectionResponse {
  total: number;
  byMode: Record<string, number>;
  byDay: Record<string, number>;
  byType: Record<string, number>;
  count: number;
  period?: PeriodInfo;
  breakdown?: BreakdownRow[];
}