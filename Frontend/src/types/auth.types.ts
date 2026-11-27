export type Role = "superadmin" | "admin" | "member" | "tenant";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  societyId?: string;
  houseId?: string;
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  mustChangePassword?: boolean;
  user: AuthUser;
}