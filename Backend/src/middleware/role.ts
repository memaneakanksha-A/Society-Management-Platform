import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { Role } from "../types/express";

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new ApiError(403, "Not authorized");
    if (!roles.includes(req.user.role)) throw new ApiError(403, "Forbidden: insufficient role");
    next();
  };

export const superAdminOnly = authorize("superadmin");
export const adminOnly = authorize("admin");