import { Request, Response } from "express";
import mongoose from "mongoose";
import EventModel from "../../models/Event";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

const parseBool = (v: any, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
};

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId: req.societyId };
  if (q.published === "true" || q.published === "false") filter.isPublished = q.published === "true";
  if (q.search) {
    const regex = new RegExp(q.search, "i");
    filter.$or = [{ title: regex }, { description: regex }, { venue: regex }];
  }

  const [events, total] = await Promise.all([
    EventModel.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EventModel.countDocuments(filter),
  ]);

  res.json({ success: true, events, total, page, pages: Math.ceil(total / limit) });
});

export const getEventItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid event id");
  const event = await EventModel.findOne({ _id: id, societyId: req.societyId });
  if (!event) throw new ApiError(404, "Event not found");
  res.json({ success: true, event });
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, any>;
  if (!body.title || !String(body.title).trim()) throw new ApiError(400, "Title is required");
  if (!body.date) throw new ApiError(400, "Date is required");

  const event = await EventModel.create({
    societyId: req.societyId,
    title: String(body.title).trim(),
    description: body.description,
    date: new Date(body.date),
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    time: body.time,
    venue: body.venue,
    image: req.file ? fileUrl("events", req.file.filename) : undefined,
    isPublished: parseBool(body.isPublished, false),
  });

  res.status(201).json({ success: true, event });
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid event id");

  const event = await EventModel.findOne({ _id: id, societyId: req.societyId });
  if (!event) throw new ApiError(404, "Event not found");

  const body = req.body as Record<string, any>;
  if (body.title !== undefined) {
    if (!String(body.title).trim()) throw new ApiError(400, "Title is required");
    event.title = String(body.title).trim();
  }
  if (body.description !== undefined) event.description = body.description;
  if (body.date !== undefined && body.date !== "") event.date = new Date(body.date);
  if (body.endDate !== undefined) event.endDate = body.endDate ? new Date(body.endDate) : undefined;
  if (body.time !== undefined) event.time = body.time;
  if (body.venue !== undefined) event.venue = body.venue;
  if (body.isPublished !== undefined) event.isPublished = parseBool(body.isPublished, event.isPublished);

  if (req.file) {
    removeFile(event.image);
    event.image = fileUrl("events", req.file.filename);
  }

  await event.save();
  res.json({ success: true, event });
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid event id");

  const event = await EventModel.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!event) throw new ApiError(404, "Event not found");

  removeFile(event.image);
  res.json({ success: true, message: "Event deleted" });
});

export const toggleEventPublish = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid event id");

  const event = await EventModel.findOne({ _id: id, societyId: req.societyId });
  if (!event) throw new ApiError(404, "Event not found");

  const body = req.body as Record<string, any>;
  event.isPublished =
    body.isPublished === undefined ? !event.isPublished : parseBool(body.isPublished, event.isPublished);
  await event.save();

  res.json({ success: true, event });
});