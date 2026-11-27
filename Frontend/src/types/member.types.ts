export interface MemberProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "member" | "tenant";
  mustChangePassword: boolean;
}

export interface MemberHouse {
  _id: string;
  houseNo: string;
  area?: number;
  location?: string;
  occupancyStatus: string;
  maintenancePayableBy: "owner" | "tenant";
  houseType?: string | null;
}

export interface MemberPerson {
  name: string;
  phone?: string;
  email?: string;
}

export interface MemberTenantSummary extends MemberPerson {
  rentAmount: number;
  agreementStartDate: string;
  agreementEndDate: string;
  status: string;
}

export interface MemberMeResponse {
  profile: MemberProfile;
  house: MemberHouse;
  owner: MemberPerson | null;
  tenant: MemberTenantSummary | null;
}

export interface MemberDashboard {
  outstanding: number;
  advanceCredit: number;
  lastPayment: {
    receiptNo: string;
    amount: number;
    paidOn: string;
    mode: string;
  } | null;
  nextDue: {
    periodLabel: string;
    amount: number;
    dueDate: string;
  } | null;
  noticesCount: number;
}

export interface MemberDue {
  _id: string;
  year: number;
  periodType: string;
  periodLabel: string;
  amount: number;
  dueDate: string;
  paidPrincipal: number;
  lateFeePaid: number;
  lateFeeWaived: number;
  status: "pending" | "partial" | "paid" | "cancelled";
}

export interface MemberDuesResponse {
  payable: boolean;
  dues: MemberDue[];
  totalOutstanding: number;
  totalLateFee: number;
}

export interface MemberPayment {
  _id: string;
  receiptNo: string;
  amount: number;
  mode: string;
  paidOn: string;
  status: "active" | "cancelled";
  kind: string;
  unallocated: number;
  payerName?: string;
}

export interface MemberNotice {
  _id: string;
  title: string;
  body?: string;
  category: string;
  attachment?: string;
  isImportant: boolean;
  publishOn?: string;
  expiresOn?: string;
}

export interface MemberMeeting {
  _id: string;
  title: string;
  type: string;
  date: string;
  time?: string;
  venue?: string;
  agenda?: string;
  status: string;
  minutes?: string;
  minutesFile?: string;
  attendeesCount: number;
}

export interface MemberEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  time?: string;
  venue?: string;
  image?: string;
}

export interface FamilyMember {
  _id: string;
  name: string;
  relation: string;
  gender: "male" | "female" | "other";
  dob?: string;
  age?: number;
  phone?: string;
  bloodGroup?: string;
  occupation?: string;
  isEmergencyContact: boolean;
}

export interface MemberVehicle {
  _id: string;
  ownerType: "owner" | "tenant";
  type: "two_wheeler" | "four_wheeler" | "cycle" | "other";
  vehicleNo: string;
  make?: string;
  vehicleModel?: string;
  colour?: string;
  parkingSlot?: string;
  stickerNo?: string;
  isActive: boolean;
}

export interface MemberLoginEntry {
  houseId: string;
  houseNo: string;
  role: "owner" | "tenant";
  name: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  isActive: boolean | null;
  mustChangePassword: boolean | null;
}

export interface MemberLoginListResponse {
  logins: MemberLoginEntry[];
  total: number;
  page: number;
  pages: number;
}

export interface BulkCreateLoginResult {
  houseNo: string;
  name: string;
  identifier: string;
  tempPassword: string;
}
export interface ComplaintHistory {
  status: string;
  note?: string;
  byName: string;
  at: string;
}

export interface Complaint {
  _id: string;
  complaintNo: string;
  houseId: string;
  houseNo?: string;
  raisedByUserId?: string;
  raisedByName: string;
  category: string;
  title: string;
  description: string;
  photos: string[];
  priority: "low" | "medium" | "high";
  status: string;
  assignedTo?: string;
  history: ComplaintHistory[];
  resolvedAt?: string;
  createdAt: string;
}

export interface ComplaintListResponse {
  complaints: Complaint[];
  total: number;
  page: number;
  pages: number;
  stats?: Record<string, number>;
}

export interface ServiceRequestHistory {
  status: string;
  note?: string;
  byName: string;
  at: string;
}

export interface ServiceRequest {
  _id: string;
  requestNo: string;
  houseId: string;
  houseNo?: string;
  requestedByUserId?: string;
  requestedBy: string;
  type: string;
  purpose: string;
  details?: string;
  status: string;
  adminRemarks?: string;
  documentFile?: string;
  issuedAt?: string;
  history: ServiceRequestHistory[];
  createdAt: string;
}

export interface ServiceRequestListResponse {
  requests: ServiceRequest[];
  total: number;
  page: number;
  pages: number;
  stats?: Record<string, number>;
}
