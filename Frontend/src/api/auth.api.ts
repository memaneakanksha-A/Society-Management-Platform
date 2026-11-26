import api from "./axios";
import type { LoginResponse } from "@/types/auth.types";

export const loginApi = async (email: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  return data;
};