import api from "./axios";
import type {
  Tenant,
  TenantStats,
  TenantListResponse,
  TenantQuery,
  VacatePayload,
  Vehicle,
  VehicleListResponse,
  VehicleQuery,
  VehicleFormData,
  FamilyMember,
  FamilyMemberFormData,
} from "@/types/tenant.types";

export const getTenants = async (query: TenantQuery): Promise<TenantListResponse> => {
  const { data } = await api.get("/admin/tenants", { params: query });
  return data as TenantListResponse;
};

export const getTenantStats = async (): Promise<TenantStats> => {
  const { data } = await api.get("/admin/tenants/stats");
  return data.stats as TenantStats;
};

export const createTenant = async (houseId: string, formData: FormData): Promise<Tenant> => {
  const { data } = await api.post(`/admin/houses/${houseId}/tenants`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.tenant as Tenant;
};

export const getTenant = async (id: string): Promise<Tenant> => {
  const { data } = await api.get(`/admin/tenants/${id}`);
  return data.tenant as Tenant;
};

export const updateTenant = async (id: string, formData: FormData): Promise<Tenant> => {
  const { data } = await api.put(`/admin/tenants/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.tenant as Tenant;
};

export const renewTenant = async (id: string, formData: FormData): Promise<Tenant> => {
  const { data } = await api.put(`/admin/tenants/${id}/renew`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.tenant as Tenant;
};

export const vacateTenant = async (id: string, payload: VacatePayload): Promise<void> => {
  await api.put(`/admin/tenants/${id}/vacate`, payload);
};

export const getHouseTenants = async (houseId: string): Promise<Tenant[]> => {
  const { data } = await api.get(`/admin/houses/${houseId}/tenants`);
  return data.tenants as Tenant[];
};

export type TenantDocumentType = "aadhaar" | "agreement" | "policeVerification" | "photo";

export const getTenantDocumentBlob = async (
  id: string,
  type: TenantDocumentType
): Promise<Blob> => {
  const { data } = await api.get(`/admin/tenants/${id}/documents/${type}`, {
    responseType: "blob",
  });
  return data as Blob;
};

export const openBlobInNewTab = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadTenantDocument = getTenantDocumentBlob;

export const getVehicles = async (query: VehicleQuery): Promise<VehicleListResponse> => {
  const { data } = await api.get("/admin/vehicles", { params: query });
  return data as VehicleListResponse;
};

export const createVehicle = async (payload: VehicleFormData): Promise<Vehicle> => {
  const { data } = await api.post("/admin/vehicles", payload);
  return data.vehicle as Vehicle;
};

export const updateVehicle = async (id: string, payload: Partial<VehicleFormData>): Promise<Vehicle> => {
  const { data } = await api.put(`/admin/vehicles/${id}`, payload);
  return data.vehicle as Vehicle;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await api.delete(`/admin/vehicles/${id}`);
};

export const getHouseVehicles = async (houseId: string): Promise<Vehicle[]> => {
  const { data } = await api.get(`/admin/houses/${houseId}/vehicles`);
  return data.vehicles as Vehicle[];
};

export const getFamilyMembers = async (houseId: string): Promise<FamilyMember[]> => {
  const { data } = await api.get(`/admin/houses/${houseId}/family`);
  return data.members as FamilyMember[];
};

export const createFamilyMember = async (houseId: string, payload: FamilyMemberFormData): Promise<FamilyMember> => {
  const { data } = await api.post(`/admin/houses/${houseId}/family`, payload);
  return data.member as FamilyMember;
};

export const updateFamilyMember = async (id: string, payload: Partial<FamilyMemberFormData>): Promise<FamilyMember> => {
  const { data } = await api.put(`/admin/family/${id}`, payload);
  return data.member as FamilyMember;
};

export const deleteFamilyMember = async (id: string): Promise<void> => {
  await api.delete(`/admin/family/${id}`);
};