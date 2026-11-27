import { Request, Response } from "express";
import mongoose from "mongoose";
import HouseType from "../../models/HouseType";
import House from "../../models/House";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

export const getHouseTypes = asyncHandler(async (req: Request, res: Response) => {
  const types = await HouseType.find({ societyId: req.societyId }).sort({ code: 1 });
  const result = await Promise.all(
    types.map(async (t) => ({
      ...t.toObject(),
      houseCount: await House.countDocuments({ houseTypeId: t._id }),
    }))
  );
  res.json({ success: true, houseTypes: result });
});

export const createHouseType = asyncHandler(async (req: Request, res: Response) => {
  const { code, name, category, defaultMaintenanceAmount } = req.body as Record<string, any>;
  if (!code || !name) throw new ApiError(400, "Code and name are required");

  const exists = await HouseType.findOne({
    societyId: req.societyId,
    code: String(code).toUpperCase(),
  });
  if (exists) throw new ApiError(409, "House type code already exists");

  const ht = await HouseType.create({
    societyId: req.societyId,
    code: String(code).toUpperCase(),
    name,
    category,
    defaultMaintenanceAmount: defaultMaintenanceAmount !== undefined ? Number(defaultMaintenanceAmount) : 0,
  });

  res.status(201).json({ success: true, houseType: ht });
});

export const updateHouseType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid house type id");

  const ht = await HouseType.findOne({ _id: id, societyId: req.societyId });
  if (!ht) throw new ApiError(404, "House type not found");

  const { code, name, category, defaultMaintenanceAmount } = req.body as Record<string, any>;
  if (code !== undefined) ht.code = String(code).toUpperCase();
  if (name !== undefined) ht.name = name;
  if (category !== undefined) ht.category = category;
  if (defaultMaintenanceAmount !== undefined)
    ht.defaultMaintenanceAmount = Number(defaultMaintenanceAmount);

  await ht.save();
  res.json({ success: true, houseType: ht });
});

export const deleteHouseType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid house type id");

  const count = await House.countDocuments({ houseTypeId: id, societyId: req.societyId });
  if (count > 0) {
    const err = new ApiError(409, `${count} houses use this type. Delete or move them to another type first.`);
    (err as any).houseCount = count;
    throw err;
  }

  const ht = await HouseType.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!ht) throw new ApiError(404, "House type not found");

  res.json({ success: true, message: "House type deleted" });
});