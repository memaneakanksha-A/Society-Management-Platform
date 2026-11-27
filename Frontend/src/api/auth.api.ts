import api from "./axios";
import type { LoginResponse } from "@/types/auth.types";

export const loginApi = async (identifier: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>("/auth/login", { identifier, password });
  return data;
};

export const changePasswordApi = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await api.post("/auth/change-password", { currentPassword, newPassword });
};