export type HouseTypeCategory = "bungalow" | "flat" | "rk" | "other";
export type OccupancyStatus = "owner_living" | "rented" | "vacant";
export type MaintenancePayableBy = "owner" | "tenant";

export interface HouseType {
  _id: string;
  societyId: string;
  code: string;
  name: string;
  category: HouseTypeCategory;
  defaultMaintenanceAmount: number;
  houseCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HouseTypeRef {
  _id: string;
  code: string;
  name: string;
}

export interface OwnerRef {
  _id: string;
  name: string;
  phone?: string;
}

export interface House {
  _id: string;
  societyId: string;
  houseTypeId: HouseTypeRef | string;
  houseNo: string;
  area?: number;
  location?: string;
  occupancyStatus: OccupancyStatus;
  maintenancePayableBy: MaintenancePayableBy;
  currentOwnerId: OwnerRef | string | null;
  currentTenantId?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Owner {
  _id: string;
  societyId: string;
  houseId: string;
  name: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  idProofType?: string;
  idProofNumber?: string;
  fromDate: string;
  toDate?: string;
  isCurrent: boolean;
  transferNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HouseStats {
  total: number;
  ownerLiving: number;
  rented: number;
  vacant: number;
  withoutOwner: number;
  byType: { code: string; count: number }[];
}

export interface HouseListResponse {
  houses: House[];
  total: number;
  page: number;
  pages: number;
}

export interface HouseDetailResponse {
  house: House;
  currentOwner: OwnerRef | null;
  ownerHistory: Owner[];
}

export interface HouseQuery {
  search?: string;
  typeId?: string;
  occupancy?: string;
  page?: number;
  limit?: number;
}

export interface BulkPayload {
  houseTypeId: string;
  prefix: string;
  mainFrom: number;
  mainTo: number;
  subFrom?: number;
  subTo?: number;
  separator?: string;
  area?: number;
  location?: string;
  maintenancePayableBy?: MaintenancePayableBy;
}

export interface BulkPreviewResult {
  preview: true;
  created: number;
  skipped: number;
  skippedList: string[];
  toCreate: string[];
}

export interface BulkCreateResult {
  created: number;
  skipped: number;
  skippedList: string[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface OwnerPayload {
  name: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  idProofType?: string;
  idProofNumber?: string;
}

export interface TransferPayload extends OwnerPayload {
  transferDate?: string;
  transferNote?: string;
}