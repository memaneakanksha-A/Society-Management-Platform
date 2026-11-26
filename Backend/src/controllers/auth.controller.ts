import { Request, Response } from "express";
import User from "../models/User";
import Society from "../models/Society";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { generateToken } from "../utils/generateToken";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) throw new ApiError(400, "Email and password are required");
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password)))
    throw new ApiError(401, "Invalid email or password");
  if (!user.isActive) throw new ApiError(403, "Account is deactivated");
  if (user.societyId) {
    const society = await Society.findById(user.societyId);
    if (!society || society.status !== "active")
      throw new ApiError(403, "Society is inactive. Contact platform admin");
  }
  const token = generateToken({
    id: user.id,
    role: user.role as any,
    societyId: user.societyId?.toString(),
  });
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      societyId: user.societyId,
    },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json({ success: true, user });
});