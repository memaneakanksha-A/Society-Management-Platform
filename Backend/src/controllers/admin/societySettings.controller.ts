import { Request, Response } from "express";
import Society from "../../models/Society";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const society = await Society.findById(req.societyId);
  if (!society) throw new ApiError(404, "Society not found");

  res.json({
    success: true,
    settings: {
      name: society.name,
      slug: society.slug,
      address: society.address,
      logo: society.logo,
      about: society.about,
      contact: {
        phone: society.contact?.phone,
        email: society.contact?.email,
        mapUrl: society.contact?.mapUrl,
      },
      officeTime: society.officeTime,
    },
  });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const society = await Society.findById(req.societyId);
  if (!society) throw new ApiError(404, "Society not found");

  const { address, about, officeTime } = req.body as Record<string, any>;
  const contact = (req.body?.contact || {}) as Record<string, any>;

  const $set: Record<string, any> = {};
  if (address !== undefined) $set.address = address;
  if (about !== undefined) $set.about = about;
  if (officeTime !== undefined) $set.officeTime = officeTime;
  if (contact.phone !== undefined) $set["contact.phone"] = contact.phone;
  if (contact.email !== undefined) $set["contact.email"] = contact.email;
  if (contact.mapUrl !== undefined) $set["contact.mapUrl"] = contact.mapUrl;

  const updated = await Society.findByIdAndUpdate(req.societyId, { $set }, { new: true });
  res.json({ success: true, settings: updated });
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, "Logo is required");

  const society = await Society.findById(req.societyId);
  if (!society) throw new ApiError(404, "Society not found");

  removeFile(society.logo);
  society.logo = fileUrl("society", req.file.filename);
  await society.save();

  res.json({ success: true, logo: society.logo });
});