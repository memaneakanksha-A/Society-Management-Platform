import { Request, Response } from "express";
import mongoose from "mongoose";
import FamilyMember from "../../models/FamilyMember";
import House from "../../models/House";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const assertHouseBelongs = async (houseId: string, societyId: string) => {
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const house = await House.findOne({ _id: houseId, societyId });
  if (!house) throw new ApiError(404, "House not found");
  return house;
};

const getParam = (params: Record<string, any>, key: string): string => {
  const val = params[key];
  return Array.isArray(val) ? val[0] : val;
};

// GET /houses/:houseId/family
export const getFamilyMembers = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = getParam(req.params, "houseId");
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");

  await assertHouseBelongs(houseId, societyId);

  const members = await FamilyMember.find({ houseId, societyId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, members });
});

// POST /houses/:houseId/family
export const createFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = getParam(req.params, "houseId");
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");

  await assertHouseBelongs(houseId, societyId);

  const body = req.body as Record<string, any>;
  const { name, relation, gender, dob, age, phone, bloodGroup, occupation, isEmergencyContact } = body;

  if (!name || !relation || !gender) {
    throw new ApiError(400, "name, relation, and gender are required");
  }

  const member = await FamilyMember.create({
    societyId,
    houseId,
    name,
    relation,
    gender,
    dob: dob ? new Date(dob) : undefined,
    age: age ? Number(age) : undefined,
    phone,
    bloodGroup,
    occupation,
    isEmergencyContact: isEmergencyContact === "true" || isEmergencyContact === true,
  });

  res.status(201).json({ success: true, member });
});

// PUT /family/:id
export const updateFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid family member id");

  const member = await FamilyMember.findOne({ _id: id, societyId });
  if (!member) throw new ApiError(404, "Family member not found");

  const body = req.body as Record<string, any>;

  const allowedFields = ["name", "relation", "gender", "dob", "age", "phone", "bloodGroup", "occupation", "isEmergencyContact"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "age") {
        member.age = Number(body[field]);
      } else if (field === "dob") {
        member.dob = body[field] ? new Date(body[field]) : undefined;
      } else if (field === "isEmergencyContact") {
        member.isEmergencyContact = body[field] === "true" || body[field] === true;
      } else {
        (member as any)[field] = body[field];
      }
    }
  }

  await member.save();

  res.json({ success: true, member });
});

// DELETE /family/:id
export const deleteFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid family member id");

  const member = await FamilyMember.findOneAndDelete({ _id: id, societyId });
  if (!member) throw new ApiError(404, "Family member not found");

  res.json({ success: true, message: "Family member deleted" });
});