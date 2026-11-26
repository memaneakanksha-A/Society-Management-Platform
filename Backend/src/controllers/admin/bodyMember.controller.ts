import { Request, Response } from "express";
import mongoose from "mongoose";
import BodyMember from "../../models/BodyMember";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

const parseBool = (v: any, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
};

export const getBodyMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await BodyMember.find({ societyId: req.societyId }).sort({ order: 1 });
  res.json({ success: true, members });
});

export const createBodyMember = asyncHandler(async (req: Request, res: Response) => {
  const { name, designation, phone, email, order, isActive } = req.body as Record<string, any>;
  if (!name) throw new ApiError(400, "Name is required");
  if (!designation) throw new ApiError(400, "Designation is required");

  const member = await BodyMember.create({
    societyId: req.societyId,
    name,
    designation,
    photo: req.file ? fileUrl("members", req.file.filename) : undefined,
    phone,
    email,
    order: order !== undefined ? Number(order) : 0,
    isActive: parseBool(isActive, true),
  });

  res.status(201).json({ success: true, member });
});

export const updateBodyMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid member id");

  const member = await BodyMember.findOne({ _id: id, societyId: req.societyId });
  if (!member) throw new ApiError(404, "Member not found");

  const { name, designation, phone, email, order, isActive } = req.body as Record<string, any>;
  if (name !== undefined) member.name = name;
  if (designation !== undefined) member.designation = designation;
  if (phone !== undefined) member.phone = phone;
  if (email !== undefined) member.email = email;
  if (order !== undefined) member.order = Number(order);
  if (isActive !== undefined) member.isActive = parseBool(isActive, member.isActive);

  if (req.file) {
    removeFile(member.photo);
    member.photo = fileUrl("members", req.file.filename);
  }

  await member.save();
  res.json({ success: true, member });
});

export const deleteBodyMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid member id");

  const member = await BodyMember.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!member) throw new ApiError(404, "Member not found");

  removeFile(member.photo);
  res.json({ success: true, message: "Member deleted" });
});