import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export const societyScope = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.societyId) throw new ApiError(403, "No society linked with this account");
  req.societyId = req.user.societyId;
  next();
};