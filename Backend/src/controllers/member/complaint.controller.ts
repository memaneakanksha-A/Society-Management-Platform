import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import Complaint, { ComplaintCategory, ComplaintPriority } from "../../models/Complaint";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { getMemberContext } from "../../utils/memberContext";
import { nextSeq } from "../../models/Counter";
import { getPrivateFilePath } from "../../config/multer";

const CATEGORIES: ComplaintCategory[] = [
  "water",
  "electricity",
  "road",
  "lift",
  "security",
  "parking",
  "noise",
  "neighbour",
  "cleanliness",
  "other",
];
const PRIORITIES: ComplaintPriority[] = ["low", "medium", "high"];

const buildComplaintNo = async (societyId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const seq = await nextSeq(societyId, `complaint:${year}`);
  return `CMP/${year}/${String(seq).padStart(4, "0")}`;
};

// POST /complaints (multipart "photos")
export const createComplaint = asyncHandler(async (req: Request, res: Response) => {
  const { user, houseId, societyId } = await getMemberContext(req);
  const body = req.body as Record<string, any>;

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  if (!title) throw new ApiError(400, "Title is required");
  if (!description) throw new ApiError(400, "Description is required");

  const category = (body.category || "other") as ComplaintCategory;
  if (!CATEGORIES.includes(category)) throw new ApiError(400, "Invalid category");

  const priority = (body.priority || "medium") as ComplaintPriority;
  if (!PRIORITIES.includes(priority)) throw new ApiError(400, "Invalid priority");

  const files = (req.files as Express.Multer.File[]) || [];
  const photos = files.map((f) => f.filename);

  const complaintNo = await buildComplaintNo(societyId);

  const complaint = await Complaint.create({
    societyId,
    complaintNo,
    houseId,
    raisedByUserId: user._id,
    raisedByName: user.name,
    category,
    title,
    description,
    photos,
    priority,
    status: "open",
    history: [{ status: "open", note: "Complaint registered", byName: user.name, at: new Date() }],
  });

  res.status(201).json({ success: true, complaint });
});

// GET /complaints
export const listComplaints = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId, houseId };
  if (q.status) filter.status = q.status;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  res.json({ success: true, complaints, total, page, pages: Math.ceil(total / limit) });
});

// GET /complaints/:id
export const getComplaint = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid complaint id");

  const complaint = await Complaint.findOne({ _id: id, societyId, houseId }).lean();
  if (!complaint) throw new ApiError(404, "Complaint not found");

  res.json({ success: true, complaint });
});

// POST /complaints/:id/comments
export const addComplaintComment = asyncHandler(async (req: Request, res: Response) => {
  const { user, houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid complaint id");

  const note = String((req.body as any).note || "").trim();
  if (!note) throw new ApiError(400, "Comment is required");

  const complaint = await Complaint.findOne({ _id: id, societyId, houseId });
  if (!complaint) throw new ApiError(404, "Complaint not found");

  complaint.history.push({ status: complaint.status, note, byName: user.name, at: new Date() });
  await complaint.save();

  res.json({ success: true, complaint });
});

// GET /complaints/:id/photos/:filename
export const getComplaintPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  const filename = String(req.params.filename);
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid complaint id");

  const complaint = await Complaint.findOne({ _id: id, societyId, houseId }).select("photos");
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (!complaint.photos.includes(filename)) throw new ApiError(404, "Photo not found");

  const filePath = getPrivateFilePath("complaints", filename);
  if (!fs.existsSync(filePath)) throw new ApiError(404, "File not found on disk");

  res.sendFile(filePath);
});