export type Role = "superadmin" | "admin" | "member" | "tenant";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  societyId?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}