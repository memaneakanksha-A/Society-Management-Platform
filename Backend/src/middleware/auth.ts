import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { TokenPayload } from "../utils/generateToken";

export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Not authorized, token missing");
  const token = header.split(" ")[1];
  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new ApiError(401, "User not found or inactive");
  req.user = { id: user.id, role: user.role as any, societyId: user.societyId?.toString() };
  next();
});