import { Request, Response } from "express";
import User from "../models/User";
import Society from "../models/Society";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { generateToken } from "../utils/generateToken";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    identifier?: string;
    email?: string;
    phone?: string;
    password?: string;
  };
  const rawIdentifier = body.identifier ?? body.email ?? body.phone;
  const password = body.password;

  if (!rawIdentifier || !password) {
    throw new ApiError(400, "Email/phone and password are required");
  }

  const identifier = String(rawIdentifier).trim().toLowerCase();
  const isEmail = identifier.includes("@");

  const query = isEmail ? { email: identifier } : { phone: String(rawIdentifier).trim() };
  const user = await User.findOne(query).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, isEmail ? "Invalid email or password" : "Invalid phone or password");
  }
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
    mustChangePassword: user.mustChangePassword,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      societyId: user.societyId,
      houseId: user.houseId,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json({ success: true, user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current and new password are required");
  }
  if (String(newPassword).length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  const user = await User.findById(req.user!.id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  res.json({ success: true, message: "Password changed successfully" });
});