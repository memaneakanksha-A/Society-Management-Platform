import { Request, Response } from "express";
import mongoose from "mongoose";
import Notice, { NoticeCategory, NoticeVisibility } from "../../models/Notice";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

const CATEGORIES: NoticeCategory[] = [
  "general",
  "maintenance",
  "water",
  "security",
  "legal",
  "event",
  "other",
];
const VISIBILITIES: NoticeVisibility[] = ["public", "members"];

const parseBool = (v: any, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
};

export const getNotices = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId: req.societyId };
  if (q.published === "true" || q.published === "false") filter.isPublished = q.published === "true";
  if (q.category) filter.category = q.category;
  if (q.search) {
    const regex = new RegExp(q.search, "i");
    filter.$or = [{ title: regex }, { body: regex }];
  }

  const [notices, total] = await Promise.all([
    Notice.find(filter)
      .sort({ isImportant: -1, publishOn: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notice.countDocuments(filter),
  ]);

  res.json({ success: true, notices, total, page, pages: Math.ceil(total / limit) });
});

export const getNoticeItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid notice id");
  const notice = await Notice.findOne({ _id: id, societyId: req.societyId });
  if (!notice) throw new ApiError(404, "Notice not found");
  res.json({ success: true, notice });
});

export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, any>;
  if (!body.title || !String(body.title).trim()) throw new ApiError(400, "Title is required");

  const category = (body.category || "general") as NoticeCategory;
  if (!CATEGORIES.includes(category)) throw new ApiError(400, "Invalid category");

  const visibility = (body.visibility || "public") as NoticeVisibility;
  if (!VISIBILITIES.includes(visibility)) throw new ApiError(400, "Invalid visibility");

  const notice = await Notice.create({
    societyId: req.societyId,
    title: String(body.title).trim(),
    body: body.body,
    category,
    attachment: req.file ? fileUrl("notices", req.file.filename) : undefined,
    isImportant: parseBool(body.isImportant, false),
    publishOn: body.publishOn ? new Date(body.publishOn) : undefined,
    expiresOn: body.expiresOn ? new Date(body.expiresOn) : undefined,
    visibility,
    isPublished: parseBool(body.isPublished, false),
  });

  res.status(201).json({ success: true, notice });
});

export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid notice id");

  const notice = await Notice.findOne({ _id: id, societyId: req.societyId });
  if (!notice) throw new ApiError(404, "Notice not found");

  const body = req.body as Record<string, any>;
  if (body.title !== undefined) {
    if (!String(body.title).trim()) throw new ApiError(400, "Title is required");
    notice.title = String(body.title).trim();
  }
  if (body.body !== undefined) notice.body = body.body;
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) throw new ApiError(400, "Invalid category");
    notice.category = body.category;
  }
  if (body.isImportant !== undefined) notice.isImportant = parseBool(body.isImportant, notice.isImportant);
  if (body.publishOn !== undefined) notice.publishOn = body.publishOn ? new Date(body.publishOn) : undefined;
  if (body.expiresOn !== undefined) notice.expiresOn = body.expiresOn ? new Date(body.expiresOn) : undefined;
  if (body.visibility !== undefined) {
    if (!VISIBILITIES.includes(body.visibility)) throw new ApiError(400, "Invalid visibility");
    notice.visibility = body.visibility;
  }
  if (body.isPublished !== undefined) notice.isPublished = parseBool(body.isPublished, notice.isPublished);

  if (req.file) {
    removeFile(notice.attachment);
    notice.attachment = fileUrl("notices", req.file.filename);
  }

  await notice.save();
  res.json({ success: true, notice });
});

export const deleteNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid notice id");

  const notice = await Notice.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!notice) throw new ApiError(404, "Notice not found");

  removeFile(notice.attachment);
  res.json({ success: true, message: "Notice deleted" });
});

export const toggleNoticePublish = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid notice id");

  const notice = await Notice.findOne({ _id: id, societyId: req.societyId });
  if (!notice) throw new ApiError(404, "Notice not found");

  const body = req.body as Record<string, any>;
  notice.isPublished =
    body.isPublished === undefined ? !notice.isPublished : parseBool(body.isPublished, notice.isPublished);
  await notice.save();

  res.json({ success: true, notice });
});