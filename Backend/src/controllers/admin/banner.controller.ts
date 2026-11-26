import { Request, Response } from "express";
import mongoose from "mongoose";
import Banner from "../../models/Banner";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

const parseBool = (v: any, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
};

export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const banners = await Banner.find({ societyId: req.societyId }).sort({ order: 1 });
  res.json({ success: true, banners });
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, "Image is required");
  const { title, subtitle, order, isActive } = req.body as Record<string, any>;
  if (!title) throw new ApiError(400, "Title is required");

  const banner = await Banner.create({
    societyId: req.societyId,
    title,
    subtitle,
    image: fileUrl("banners", req.file.filename),
    order: order !== undefined ? Number(order) : 0,
    isActive: parseBool(isActive, true),
  });

  res.status(201).json({ success: true, banner });
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid banner id");

  const banner = await Banner.findOne({ _id: id, societyId: req.societyId });
  if (!banner) throw new ApiError(404, "Banner not found");

  const { title, subtitle, order, isActive } = req.body as Record<string, any>;
  if (title !== undefined) banner.title = title;
  if (subtitle !== undefined) banner.subtitle = subtitle;
  if (order !== undefined) banner.order = Number(order);
  if (isActive !== undefined) banner.isActive = parseBool(isActive, banner.isActive);

  if (req.file) {
    removeFile(banner.image);
    banner.image = fileUrl("banners", req.file.filename);
  }

  await banner.save();
  res.json({ success: true, banner });
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid banner id");

  const banner = await Banner.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!banner) throw new ApiError(404, "Banner not found");

  removeFile(banner.image);
  res.json({ success: true, message: "Banner deleted" });
});