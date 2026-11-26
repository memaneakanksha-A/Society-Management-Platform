import { Request, Response } from "express";
import mongoose from "mongoose";
import House from "../../models/House";
import HouseType from "../../models/HouseType";
import Owner from "../../models/Owner";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { importHousesFromFile } from "../../services/import.service";

const asObjectId = (id?: string) =>
  id ? new mongoose.Types.ObjectId(id) : new mongoose.Types.ObjectId();

const assertTypeBelongs = async (typeId: string, societyId: string) => {
  if (!mongoose.isValidObjectId(typeId)) throw new ApiError(400, "Invalid house type id");
  const t = await HouseType.findOne({ _id: typeId, societyId });
  if (!t) throw new ApiError(400, "House type not found for this society");
  return t;
};

export const getHouses = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { search, typeId, occupancy } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const limit = Math.max(1, parseInt((req.query.limit as string) || "20", 10) || 20);

  const filter: Record<string, any> = { societyId };
  if (typeId) {
    if (!mongoose.isValidObjectId(typeId)) throw new ApiError(400, "Invalid typeId");
    filter.houseTypeId = typeId;
  }
  if (occupancy) filter.occupancyStatus = occupancy;

  if (search) {
    const regex = new RegExp(search, "i");
    const owners = await Owner.find({ societyId, name: regex }).select("_id");
    const ownerHouseIds = owners.map((o) => o.houseId);
    filter.$or = [{ houseNo: regex }];
    if (ownerHouseIds.length > 0) filter.$or.push({ _id: { $in: ownerHouseIds } });
  }

  const [houses, total] = await Promise.all([
    House.find(filter)
      .sort({ houseNo: 1 })
      .collation({ locale: "en", numericOrdering: true })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("houseTypeId", "code name")
      .populate("currentOwnerId", "name phone"),
    House.countDocuments(filter),
  ]);

  res.json({ success: true, houses, total, page, pages: Math.ceil(total / limit) });
});

export const getHouseStats = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const sid = asObjectId(societyId);

  const [total, ownerLiving, rented, vacant, withoutOwner, byTypeAgg] = await Promise.all([
    House.countDocuments({ societyId }),
    House.countDocuments({ societyId, occupancyStatus: "owner_living" }),
    House.countDocuments({ societyId, occupancyStatus: "rented" }),
    House.countDocuments({ societyId, occupancyStatus: "vacant" }),
    House.countDocuments({ societyId, currentOwnerId: null }),
    House.aggregate([
      { $match: { societyId: sid } },
      { $group: { _id: "$houseTypeId", count: { $sum: 1 } } },
    ]),
  ]);

  const byType = await Promise.all(
    byTypeAgg.map(async (row) => {
      const t = await HouseType.findById(row._id).select("code");
      return { code: t?.code || "?", count: row.count as number };
    })
  );

  res.json({ success: true, stats: { total, ownerLiving, rented, vacant, withoutOwner, byType } });
});

export const getHouse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid house id");

  const house = await House.findOne({ _id: id, societyId: req.societyId })
    .populate("houseTypeId", "code name")
    .populate("currentOwnerId", "name phone");
  if (!house) throw new ApiError(404, "House not found");

  const ownerHistory = await Owner.find({ houseId: id, societyId: req.societyId }).sort({
    fromDate: -1,
  });

  res.json({ success: true, house, currentOwner: house.currentOwnerId, ownerHistory });
});

export const createHouse = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const {
    houseTypeId,
    houseNo,
    area,
    location,
    occupancyStatus,
    maintenancePayableBy,
    notes,
  } = req.body as Record<string, any>;

  if (!houseNo) throw new ApiError(400, "houseNo is required");
  await assertTypeBelongs(houseTypeId, societyId);

  const normalized = String(houseNo).toUpperCase().trim();
  const exists = await House.findOne({ societyId, houseNo: normalized });
  if (exists) throw new ApiError(409, "House number already exists");

  const house = await House.create({
    societyId,
    houseTypeId,
    houseNo: normalized,
    area: area !== undefined ? Number(area) : undefined,
    location,
    occupancyStatus,
    maintenancePayableBy,
    notes,
  });

  res.status(201).json({ success: true, house });
});

export const updateHouse = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid house id");

  const house = await House.findOne({ _id: id, societyId });
  if (!house) throw new ApiError(404, "House not found");

  const { houseTypeId, houseNo, area, location, occupancyStatus, maintenancePayableBy, notes } =
    req.body as Record<string, any>;

  if (houseTypeId !== undefined) {
    await assertTypeBelongs(houseTypeId, societyId);
    house.houseTypeId = houseTypeId;
  }
  if (houseNo !== undefined) {
    const normalized = String(houseNo).toUpperCase().trim();
    const dup = await House.findOne({ societyId, houseNo: normalized, _id: { $ne: id } });
    if (dup) throw new ApiError(409, "House number already exists");
    house.houseNo = normalized;
  }
  if (area !== undefined) house.area = Number(area);
  if (location !== undefined) house.location = location;
  if (occupancyStatus !== undefined) house.occupancyStatus = occupancyStatus;
  if (maintenancePayableBy !== undefined) house.maintenancePayableBy = maintenancePayableBy;
  if (notes !== undefined) house.notes = notes;

  await house.save();
  res.json({ success: true, house });
});

export const deleteHouse = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid house id");

  const ownerCount = await Owner.countDocuments({ houseId: id, societyId });
  if (ownerCount > 0)
    throw new ApiError(409, "Cannot delete: remove owners first or mark the house vacant");

  const house = await House.findOneAndDelete({ _id: id, societyId });
  if (!house) throw new ApiError(404, "House not found");

  res.json({ success: true, message: "House deleted" });
});

export const bulkCreateHouses = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const {
    houseTypeId,
    prefix,
    mainFrom,
    mainTo,
    subFrom,
    subTo,
    separator = "/",
    area,
    location,
    maintenancePayableBy,
  } = req.body as Record<string, any>;

  await assertTypeBelongs(houseTypeId, societyId);

  const p = String(prefix ?? "").toUpperCase();
  const mFrom = Number(mainFrom);
  const mTo = Number(mainTo);
  if (!Number.isInteger(mFrom) || !Number.isInteger(mTo) || mFrom > mTo)
    throw new ApiError(400, "Invalid main range");

  const hasSub = subFrom !== undefined && subTo !== undefined;
  let sFrom = 0;
  let sTo = 0;
  if (hasSub) {
    sFrom = Number(subFrom);
    sTo = Number(subTo);
    if (!Number.isInteger(sFrom) || !Number.isInteger(sTo) || sFrom > sTo)
      throw new ApiError(400, "Invalid sub range");
  }

  const houseNos: string[] = [];
  for (let m = mFrom; m <= mTo; m++) {
    if (hasSub) {
      for (let s = sFrom; s <= sTo; s++) {
        houseNos.push(`${p}${m}${separator}${s}`.toUpperCase());
      }
    } else {
      houseNos.push(`${p}${m}`.toUpperCase());
    }
  }

  if (houseNos.length > 1000)
    throw new ApiError(400, "A single request can create at most 1000 houses");

  const existing = await House.find({
    societyId,
    houseNo: { $in: houseNos },
  }).select("houseNo");
  const existingSet = new Set(existing.map((h) => h.houseNo));
  const skippedList = houseNos.filter((n) => existingSet.has(n));
  const toCreate = houseNos.filter((n) => !existingSet.has(n));

  if ((req.query.preview as string) === "true") {
    return res.json({
      success: true,
      preview: true,
      created: toCreate.length,
      skipped: skippedList.length,
      skippedList,
      toCreate,
    });
  }

  let created = 0;
  if (toCreate.length > 0) {
    const docs = toCreate.map((houseNo) => ({
      societyId,
      houseTypeId,
      houseNo,
      area: area !== undefined ? Number(area) : undefined,
      location,
      maintenancePayableBy,
    }));
    try {
      const inserted = await House.insertMany(docs, { ordered: false });
      created = inserted.length;
    } catch (err: any) {
      if (err?.insertedDocs) {
        created = err.insertedDocs.length;
      } else {
        throw err;
      }
    }
  }

  res.status(201).json({
    success: true,
    created,
    skipped: skippedList.length + (toCreate.length - created),
    skippedList,
  });
});

export const importHouses = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, "File is required");
  const result = await importHousesFromFile(req.file.buffer, req.societyId as string);
  res.json({ success: true, ...result });
});