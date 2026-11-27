import { Request, Response } from "express";
import mongoose from "mongoose";
import House from "../../models/House";
import Owner from "../../models/Owner";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const loadHouse = async (houseId: string | string[], societyId: string) => {
  const id = Array.isArray(houseId) ? houseId[0] : houseId;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid house id");
  const house = await House.findOne({ _id: id, societyId });
  if (!house) throw new ApiError(404, "House not found");
  return house;
};

const parseEmergencyContact = (raw: any): { name: string; phone: string; relation: string } | undefined => {
  if (!raw) return undefined;
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!obj || (!obj.name && !obj.phone && !obj.relation)) return undefined;
  return { name: obj.name || "", phone: obj.phone || "", relation: obj.relation || "" };
};

export const assignOwner = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { houseId } = req.params;
  const house = await loadHouse(houseId, societyId);

  if (house.currentOwnerId)
    throw new ApiError(409, "House already has an owner. Use transfer instead");

  const { name, phone, altPhone, email, idProofType, idProofNumber, emergencyContact } = req.body as Record<
    string,
    any
  >;
  if (!name) throw new ApiError(400, "Name is required");

  const owner = await Owner.create({
    societyId,
    houseId: house._id,
    name,
    phone,
    altPhone,
    email,
    idProofType,
    idProofNumber,
    emergencyContact: parseEmergencyContact(emergencyContact),
    isCurrent: true,
  });

  try {
    house.currentOwnerId = owner._id as mongoose.Types.ObjectId;
    await house.save();
  } catch (err) {
    await Owner.deleteOne({ _id: owner._id });
    throw err;
  }

  res.status(201).json({ success: true, owner });
});

export const updateOwner = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid owner id");

  const owner = await Owner.findOne({ _id: id, societyId });
  if (!owner) throw new ApiError(404, "Owner not found");

  const { name, phone, altPhone, email, idProofType, idProofNumber, emergencyContact } = req.body as Record<
    string,
    any
  >;
  if (name !== undefined) owner.name = name;
  if (phone !== undefined) owner.phone = phone;
  if (altPhone !== undefined) owner.altPhone = altPhone;
  if (email !== undefined) owner.email = email;
  if (idProofType !== undefined) owner.idProofType = idProofType;
  if (idProofNumber !== undefined) owner.idProofNumber = idProofNumber;
  if (emergencyContact !== undefined) owner.emergencyContact = parseEmergencyContact(emergencyContact);

  await owner.save();
  res.json({ success: true, owner });
});

export const transferOwner = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { houseId } = req.params;
  const house = await loadHouse(houseId, societyId);

  const {
    name,
    phone,
    email,
    altPhone,
    idProofType,
    idProofNumber,
    emergencyContact,
    transferDate,
    transferNote,
  } = req.body as Record<string, any>;
  if (!name) throw new ApiError(400, "Name is required");

  const date = transferDate ? new Date(transferDate) : new Date();

  const newOwner = await Owner.create({
    societyId,
    houseId: house._id,
    name,
    phone,
    email,
    altPhone,
    idProofType,
    idProofNumber,
    emergencyContact: parseEmergencyContact(emergencyContact),
    fromDate: date,
    isCurrent: true,
    transferNote,
  });

  try {
    if (house.currentOwnerId) {
      await Owner.updateOne(
        { _id: house.currentOwnerId, societyId },
        { $set: { isCurrent: false, toDate: date } }
      );
    }
    house.currentOwnerId = newOwner._id as mongoose.Types.ObjectId;
    await house.save();
  } catch (err) {
    await Owner.deleteOne({ _id: newOwner._id });
    throw err;
  }

  res.status(201).json({ success: true, owner: newOwner });
});

export const getOwners = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { houseId } = req.params;
  await loadHouse(houseId, societyId);

  const owners = await Owner.find({ houseId, societyId }).sort({ fromDate: -1 });
  res.json({ success: true, owners });
});