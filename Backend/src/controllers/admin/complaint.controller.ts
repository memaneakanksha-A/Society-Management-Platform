import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import Complaint, { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "../../models/Complaint";
import House from "../../models/House";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
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
const STATUSES: ComplaintStatus[] = ["open", "in_progress", "resolved", "closed", "rejected"];

const adminName = (req: Request): string => (req as any).user?.name || "Admin";

const buildComplaintNo = async (societyId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const seq = await nextSeq(societyId, `complaint:${year}`);
  return `CMP/${year}/${String(seq).padStart(4, "0")}`;
};

// GET /complaints?status=&category=&priority=&search=&page=
export const listComplaints = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId };
  if (q.status) filter.status = q.status;
  if (q.category) filter.category = q.category;
  if (q.priority) filter.priority = q.priority;
  if (q.search) {
    const regex = new RegExp(q.search, "i");
    const houses = await House.find({ societyId, houseNo: regex }).select("_id");
    filter.$or = [{ title: regex }, { description: regex }, { complaintNo: regex }];
    if (houses.length) filter.$or.push({ houseId: { $in: houses.map((h) => h._id) } });
  }

  const [complaints, total, all] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("houseId", "houseNo")
      .lean(),
    Complaint.countDocuments(filter),
    Complaint.find({ societyId }).select("status").lean(),
  ]);

  const stats = { total: all.length } as Record<string, number>;
  STATUSES.forEach((s) => {
    stats[s] = (all as any[]).filter((c) => c.status === s).length;
  });

  res.json({
    success: true,
    complaints,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats,
  });
});

// GET /complaints/:id
export const getComplaint = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid complaint id");

  const complaint = await Complaint.findOne({ _id: id, societyId })
    .populate("houseId", "houseNo")
    .lean();
  if (!complaint) throw new ApiError(404, "Complaint not found");

  res.json({ success: true, complaint });
});

// PATCH /complaints/:id { status, assignedTo, priority, note }
export const updateComplaint = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid complaint id");

  const complaint = await Complaint.findOne({ _id: id, societyId });
  if (!complaint) throw new ApiError(404, "Complaint not found");

  const body = req.body as Record<string, any>;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw new ApiError(400, "Invalid status");
    complaint.status = body.status;
    if (body.status === "resolved" || body.status === "closed") {
      complaint.resolvedAt = complaint.resolvedAt || new Date();
    }
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) throw new ApiError(400, "Invalid priority");
    complaint.priority = body.priority;
  }
  if (body.assignedTo !== undefined) {
    complaint.assignedTo = body.assignedTo ? String(body.assignedTo).trim() : undefined;
  }

  complaint.history.push({
    status: complaint.status,
    note: body.note ? String(body.note).trim() : "Complaint updated",
    byName: adminName(req),
    at: new Date(),
  });

  await complaint.save();
  res.json({ success: true, complaint });
});

// POST /complaints/:id/comments
export const addComplaintComment = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid complaint id");

  const note = String((req.body as any).note || "").trim();
  if (!note) throw new ApiError(400, "Comment is required");

  const complaint = await Complaint.findOne({ _id: id, societyId });
  if (!complaint) throw new ApiError(404, "Complaint not found");

  complaint.history.push({ status: complaint.status, note, byName: adminName(req), at: new Date() });
  await complaint.save();

  res.json({ success: true, complaint });
});

// POST /complaints (on behalf of a house, multipart "photos")
export const createComplaint = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;

  const houseId = String(body.houseId || "");
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const house = await House.findOne({ _id: houseId, societyId });
  if (!house) throw new ApiError(404, "House not found");

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

  const raisedByName = body.raisedByName
    ? String(body.raisedByName).trim()
    : adminName(req);

  const complaintNo = await buildComplaintNo(societyId);

  const complaint = await Complaint.create({
    societyId,
    complaintNo,
    houseId,
    raisedByUserId: req.user!.id,
    raisedByName,
    category,
    title,
    description,
    photos,
    priority,
    status: "open",
    history: [{ status: "open", note: "Complaint registered by admin", byName: adminName(req), at: new Date() }],
  });

  res.status(201).json({ success: true, complaint });
});

// GET /complaints/:id/photos/:filename
export const getComplaintPhoto = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  const filename = String(req.params.filename);
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid complaint id");

  const complaint = await Complaint.findOne({ _id: id, societyId }).select("photos");
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (!complaint.photos.includes(filename)) throw new ApiError(404, "Photo not found");

  const filePath = getPrivateFilePath("complaints", filename);
  if (!fs.existsSync(filePath)) throw new ApiError(404, "File not found on disk");

  res.sendFile(filePath);
});