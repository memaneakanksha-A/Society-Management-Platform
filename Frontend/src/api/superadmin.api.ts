import api from "./axios";
import type { Society, SocietyFormData } from "@/types/society.types";

export const getSocieties = async (): Promise<Society[]> => {
  const { data } = await api.get("/superadmin/societies");
  return data.societies;
};

export const getSociety = async (id: string): Promise<Society> => {
  const { data } = await api.get(`/superadmin/societies/${id}`);
  return data.society;
};

export const createSociety = async (form: SocietyFormData) => {
  const { data } = await api.post("/superadmin/societies", form);
  return data;
};

export const updateSociety = async (id: string, form: Partial<SocietyFormData>) => {
  const { data } = await api.put(`/superadmin/societies/${id}`, form);
  return data;
};

export const toggleSocietyStatus = async (id: string) => {
  const { data } = await api.patch(`/superadmin/societies/${id}/status`);
  return data;
};