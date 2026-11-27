import { Request, Response } from "express";
import mongoose from "mongoose";
import News from "../../models/News";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

const parseBool = (v: any, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
};

export const getNews = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId: req.societyId };
  if (q.published === "true" || q.published === "false") filter.isPublished = q.published === "true";
  if (q.search) {
    const regex = new RegExp(q.search, "i");
    filter.$or = [{ title: regex }, { summary: regex }, { body: regex }];
  }

  const [news, total] = await Promise.all([
    News.find(filter)
      .sort({ isPinned: -1, date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    News.countDocuments(filter),
  ]);

  res.json({ success: true, news, total, page, pages: Math.ceil(total / limit) });
});

export const getNewsItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid news id");
  const news = await News.findOne({ _id: id, societyId: req.societyId });
  if (!news) throw new ApiError(404, "News not found");
  res.json({ success: true, news });
});

export const createNews = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, any>;
  if (!body.title || !String(body.title).trim()) throw new ApiError(400, "Title is required");

  const news = await News.create({
    societyId: req.societyId,
    title: String(body.title).trim(),
    summary: body.summary,
    body: body.body,
    image: req.file ? fileUrl("news", req.file.filename) : undefined,
    date: body.date ? new Date(body.date) : new Date(),
    isPublished: parseBool(body.isPublished, false),
    isPinned: parseBool(body.isPinned, false),
  });

  res.status(201).json({ success: true, news });
});

export const updateNews = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid news id");

  const news = await News.findOne({ _id: id, societyId: req.societyId });
  if (!news) throw new ApiError(404, "News not found");

  const body = req.body as Record<string, any>;
  if (body.title !== undefined) {
    if (!String(body.title).trim()) throw new ApiError(400, "Title is required");
    news.title = String(body.title).trim();
  }
  if (body.summary !== undefined) news.summary = body.summary;
  if (body.body !== undefined) news.body = body.body;
  if (body.date !== undefined && body.date !== "") news.date = new Date(body.date);
  if (body.isPublished !== undefined) news.isPublished = parseBool(body.isPublished, news.isPublished);
  if (body.isPinned !== undefined) news.isPinned = parseBool(body.isPinned, news.isPinned);

  if (req.file) {
    removeFile(news.image);
    news.image = fileUrl("news", req.file.filename);
  }

  await news.save();
  res.json({ success: true, news });
});

export const deleteNews = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid news id");

  const news = await News.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!news) throw new ApiError(404, "News not found");

  removeFile(news.image);
  res.json({ success: true, message: "News deleted" });
});

export const toggleNewsPublish = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid news id");

  const news = await News.findOne({ _id: id, societyId: req.societyId });
  if (!news) throw new ApiError(404, "News not found");

  const body = req.body as Record<string, any>;
  news.isPublished =
    body.isPublished === undefined ? !news.isPublished : parseBool(body.isPublished, news.isPublished);
  await news.save();

  res.json({ success: true, news });
});