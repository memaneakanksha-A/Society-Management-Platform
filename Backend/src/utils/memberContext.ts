import { Request } from "express";
import User from "../models/User";
import { ApiError } from "./ApiError";

export interface MemberContext {
  user: any;
  houseId: string;
  societyId: string;
}

export const getMemberContext = async (req: Request): Promise<MemberContext> => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new ApiError(404, "User not found");
  if (!user.houseId || !user.societyId) {
    throw new ApiError(403, "No house is linked with this account");
  }
  return { user, houseId: String(user.houseId), societyId: String(user.societyId) };
};