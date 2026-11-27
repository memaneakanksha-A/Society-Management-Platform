import { Request, Response } from "express";
import mongoose from "mongoose";
import Vehicle from "../../models/Vehicle";
import House from "../../models/House";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const asObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const getParam = (params: Record<string, any>, key: string): string => {
  const val = params[key];
  return Array.isArray(val) ? val[0] : val;
};

const assertHouseBelongs = async (houseId: string, societyId: string) => {
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const house = await House.findOne({ _id: houseId, societyId });
  if (!house) throw new ApiError(404, "House not found");
  return house;
};

const resolveOwnerRef = (house: { currentOwnerId?: any; currentTenantId?: any }, ownerType: string): string => {
  if (ownerType === "owner") {
    if (!house.currentOwnerId) {
      throw new ApiError(400, "This house has no owner yet. Add an owner first.");
    }
    return String(house.currentOwnerId);
  }
  if (ownerType === "tenant") {
    if (!house.currentTenantId) {
      throw new ApiError(400, "This house has no active tenant. Mark it as rented first.");
    }
    return String(house.currentTenantId);
  }
  throw new ApiError(400, "Invalid ownerType. Must be 'owner' or 'tenant'");
};

// GET /vehicles
export const getVehicles = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { search, type, houseId, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const filter: Record<string, any> = { societyId };

  if (type) filter.type = type;
  if (houseId) {
    if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid houseId");
    filter.houseId = houseId;
  }

  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [
      { vehicleNo: regex },
      { make: regex },
      { vehicleModel: regex },
    ];
  }

  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("houseId", "houseNo")
      .lean(),
    Vehicle.countDocuments(filter),
  ]);

  res.json({ success: true, vehicles, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// POST /vehicles
export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;

  const { houseId, ownerType, type, vehicleNo, make, vehicleModel, colour, parkingSlot, stickerNo } = body;

  if (!houseId || !ownerType || !type || !vehicleNo) {
    throw new ApiError(400, "houseId, ownerType, type, and vehicleNo are required");
  }

  const house = await assertHouseBelongs(houseId, societyId);
  const ownerRefId = resolveOwnerRef(house, ownerType);

  const normalizedVehicleNo = String(vehicleNo).toUpperCase().replace(/\s+/g, "");

  // Check for duplicate vehicle number in society
  const existing = await Vehicle.findOne({ societyId, vehicleNo: normalizedVehicleNo });
  if (existing) throw new ApiError(409, "Vehicle number already registered in this society");

  const vehicle = await Vehicle.create({
    societyId,
    houseId,
    ownerType,
    ownerRefId,
    type,
    vehicleNo: normalizedVehicleNo,
    make,
    vehicleModel,
    colour,
    parkingSlot,
    stickerNo,
    isActive: true,
  });

  const populated = await Vehicle.findById(vehicle._id)
    .populate("houseId", "houseNo")
    .lean();

  res.status(201).json({ success: true, vehicle: populated });
});

// PUT /vehicles/:id
export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid vehicle id");

  const vehicle = await Vehicle.findOne({ _id: id, societyId });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  const body = req.body as Record<string, any>;

  // Re-resolve owner reference from the house; ignore any ownerRefId from the client
  const effectiveHouseId = body.houseId !== undefined ? body.houseId : String(vehicle.houseId);
  const effectiveOwnerType = body.ownerType !== undefined ? body.ownerType : vehicle.ownerType;
  const house = await assertHouseBelongs(effectiveHouseId, societyId);
  vehicle.houseId = house._id as any;
  vehicle.ownerType = effectiveOwnerType;
  vehicle.ownerRefId = resolveOwnerRef(house, effectiveOwnerType) as any;

  if (body.vehicleNo !== undefined) {
    const normalized = String(body.vehicleNo).toUpperCase().replace(/\s+/g, "");
    if (normalized !== vehicle.vehicleNo) {
      const existing = await Vehicle.findOne({ societyId, vehicleNo: normalized, _id: { $ne: id } });
      if (existing) throw new ApiError(409, "Vehicle number already registered in this society");
    }
    vehicle.vehicleNo = normalized;
  }

  if (body.type !== undefined) vehicle.type = body.type;
  if (body.make !== undefined) vehicle.make = body.make;
  if (body.vehicleModel !== undefined) vehicle.vehicleModel = body.vehicleModel;
  if (body.colour !== undefined) vehicle.colour = body.colour;
  if (body.parkingSlot !== undefined) vehicle.parkingSlot = body.parkingSlot;
  if (body.stickerNo !== undefined) vehicle.stickerNo = body.stickerNo;
  if (body.isActive !== undefined) vehicle.isActive = body.isActive === "true" || body.isActive === true;

  await vehicle.save();

  const populated = await Vehicle.findById(vehicle._id)
    .populate("houseId", "houseNo")
    .lean();

  res.json({ success: true, vehicle: populated });
});

// DELETE /vehicles/:id
export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const id = getParam(req.params, "id");
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid vehicle id");

  const vehicle = await Vehicle.findOneAndDelete({ _id: id, societyId });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  res.json({ success: true, message: "Vehicle deleted" });
});

// GET /houses/:houseId/vehicles
export const getHouseVehicles = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = getParam(req.params, "houseId");
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");

  await assertHouseBelongs(houseId, societyId);

  const vehicles = await Vehicle.find({ houseId, societyId })
    .sort({ createdAt: -1 })
    .populate("houseId", "houseNo")
    .lean();

  res.json({ success: true, vehicles });
});