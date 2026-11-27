export type TenantStatus = "active" | "vacated";
export type PoliceVerificationStatus = "pending" | "done" | "not_required";
export type AgreementState = "valid" | "expiring_soon" | "expired";
export type OwnerType = "owner" | "tenant";
export type VehicleType = "two_wheeler" | "four_wheeler" | "cycle" | "other";
export type Gender = "male" | "female" | "other";

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface AgreementHistory {
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  file?: string;
  renewedAt: string;
}

export interface TenantDocuments {
  aadhaar?: string;
  agreement?: string;
  policeVerification?: string;
  photo?: string;
}

export interface Tenant {
  _id: string;
  societyId: string;
  houseId: string;
  ownerId?: string;
  name: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  membersCount?: number;
  occupation?: string;
  workplace?: string;
  permanentAddress?: string;
  emergencyContact?: EmergencyContact;
  idProofType?: string;
  idProofNumber?: string;
  rentAmount: number;
  depositAmount: number;
  agreementStartDate: string;
  agreementEndDate: string;
  agreements: AgreementHistory[];
  policeVerification: {
    status: PoliceVerificationStatus;
    date?: string;
    remarks?: string;
  };
  documents: TenantDocuments;
  status: TenantStatus;
  vacatedOn?: string;
  vacateReason?: string;
  remarks?: string;
  agreementState?: AgreementState;
  daysLeft?: number;
  house?: { houseNo: string };
}

export interface TenantStats {
  active: number;
  expiringSoon: number;
  expired: number;
  vacated: number;
  policeVerificationPending: number;
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  pages: number;
}

export interface TenantQuery {
  status?: "active" | "vacated" | "expiring" | "expired";
  search?: string;
  houseId?: string;
  page?: number;
  limit?: number;
}

export interface TenantFormData {
  name: string;
  phone: string;
  altPhone: string;
  email: string;
  membersCount: string;
  occupation: string;
  workplace: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  idProofType: string;
  idProofNumber: string;
  rentAmount: string;
  depositAmount: string;
  agreementStartDate: string;
  agreementEndDate: string;
  policeVerificationStatus: PoliceVerificationStatus;
  policeVerificationDate: string;
  policeVerificationRemarks: string;
  aadhaarFile?: File;
  agreementFile?: File;
  policeVerificationFile?: File;
  photoFile?: File;
}

export interface RenewPayload {
  agreementStartDate: string;
  agreementEndDate: string;
  rentAmount: string;
  depositAmount: string;
  agreementFile?: File;
}

export interface VacatePayload {
  vacatedOn: string;
  reason: string;
  markVacant: boolean;
}

export interface Vehicle {
  _id: string;
  societyId: string;
  houseId: string;
  ownerType: OwnerType;
  ownerRefId: string;
  type: VehicleType;
  vehicleNo: string;
  make?: string;
  vehicleModel?: string;
  colour?: string;
  parkingSlot?: string;
  stickerNo?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  house?: { houseNo: string };
}

export interface VehicleListResponse {
  vehicles: Vehicle[];
  total: number;
  page: number;
  pages: number;
}

export interface VehicleQuery {
  search?: string;
  type?: VehicleType;
  houseId?: string;
  page?: number;
  limit?: number;
}

export interface VehicleFormData {
  houseId: string;
  ownerType: OwnerType;
  ownerRefId?: string;
  type: VehicleType;
  vehicleNo: string;
  make: string;
  vehicleModel: string;
  colour: string;
  parkingSlot: string;
  stickerNo: string;
  isActive: boolean;
}

export interface FamilyMember {
  _id: string;
  societyId: string;
  houseId: string;
  name: string;
  relation: string;
  gender: Gender;
  dob?: string;
  age?: number;
  phone?: string;
  bloodGroup?: string;
  occupation?: string;
  isEmergencyContact: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FamilyMemberFormData {
  name: string;
  relation: string;
  gender: Gender;
  dob: string;
  age: string;
  phone: string;
  bloodGroup: string;
  occupation: string;
  isEmergencyContact: boolean;
}