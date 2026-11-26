import "express-serve-static-core";

export type Role = "superadmin" | "admin" | "member" | "tenant";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: Role;
      societyId?: string;
    };
    societyId?: string;
  }
}