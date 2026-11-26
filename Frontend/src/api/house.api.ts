import api from "./axios";
import type {
  HouseType,
  House,
  Owner,
  HouseStats,
  HouseListResponse,
  HouseDetailResponse,
  HouseQuery,
  BulkPayload,
  BulkPreviewResult,
  BulkCreateResult,
  ImportResult,
  OwnerPayload,
  TransferPayload,
} from "@/types/house.types";

export const getHouseTypes = async (): Promise<HouseType[]> => {
  const { data } = await api.get("/admin/house-types");
  return data.houseTypes as HouseType[];
};

export const createHouseType = async (payload: Partial<HouseType>): Promise<HouseType> => {
  const { data } = await api.post("/admin/house-types", payload);
  return data.houseType as HouseType;
};

export const updateHouseType = async (
  id: string,
  payload: Partial<HouseType>
): Promise<HouseType> => {
  const { data } = await api.put(`/admin/house-types/${id}`, payload);
  return data.houseType as HouseType;
};

export const deleteHouseType = async (id: string): Promise<void> => {
  await api.delete(`/admin/house-types/${id}`);
};

export const getHouses = async (query: HouseQuery): Promise<HouseListResponse> => {
  const { data } = await api.get("/admin/houses", { params: query });
  return data as HouseListResponse;
};

export const getHouseStats = async (): Promise<HouseStats> => {
  const { data } = await api.get("/admin/houses/stats");
  return data.stats as HouseStats;
};

export const getHouse = async (id: string): Promise<HouseDetailResponse> => {
  const { data } = await api.get(`/admin/houses/${id}`);
  return data as HouseDetailResponse;
};

export const createHouse = async (payload: Record<string, unknown>): Promise<House> => {
  const { data } = await api.post("/admin/houses", payload);
  return data.house as House;
};

export const updateHouse = async (
  id: string,
  payload: Record<string, unknown>
): Promise<House> => {
  const { data } = await api.put(`/admin/houses/${id}`, payload);
  return data.house as House;
};

export const deleteHouse = async (id: string): Promise<void> => {
  await api.delete(`/admin/houses/${id}`);
};

export const bulkCreateHouses = async (
  payload: BulkPayload,
  preview = false
): Promise<BulkPreviewResult | BulkCreateResult> => {
  const { data } = await api.post("/admin/houses/bulk", payload, {
    params: preview ? { preview: true } : undefined,
  });
  return data as BulkPreviewResult | BulkCreateResult;
};

export const importHouses = async (file: File): Promise<ImportResult> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/admin/houses/import", form);
  return data as ImportResult;
};

export const assignOwner = async (houseId: string, payload: OwnerPayload): Promise<Owner> => {
  const { data } = await api.post(`/admin/houses/${houseId}/owner`, payload);
  return data.owner as Owner;
};

export const updateOwner = async (id: string, payload: OwnerPayload): Promise<Owner> => {
  const { data } = await api.put(`/admin/owners/${id}`, payload);
  return data.owner as Owner;
};

export const transferOwner = async (
  houseId: string,
  payload: TransferPayload
): Promise<Owner> => {
  const { data } = await api.post(`/admin/houses/${houseId}/owner/transfer`, payload);
  return data.owner as Owner;
};

export const getOwners = async (houseId: string): Promise<Owner[]> => {
  const { data } = await api.get(`/admin/houses/${houseId}/owners`);
  return data.owners as Owner[];
};