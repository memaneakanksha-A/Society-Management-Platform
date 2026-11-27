import { Request, Response } from "express";
import mongoose from "mongoose";
import Meeting, { MeetingType, MeetingStatus } from "../../models/Meeting";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

const TYPES: MeetingType[] = ["general_body", "committee", "agm", "special"];
const STATUSES: MeetingStatus[] = ["upcoming", "completed", "cancelled"];

const parseBool = (v: any, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
};

export const getMeetings = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId: req.societyId };
  if (q.published === "true" || q.published === "false") filter.isPublished = q.published === "true";
  if (q.status) filter.status = q.status;
  if (q.search) {
    const regex = new RegExp(q.search, "i");
    filter.$or = [{ title: regex }, { agenda: regex }, { venue: regex }];
  }

  const [meetings, total] = await Promise.all([
    Meeting.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(filter),
  ]);

  res.json({ success: true, meetings, total, page, pages: Math.ceil(total / limit) });
});

export const getMeetingItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid meeting id");
  const meeting = await Meeting.findOne({ _id: id, societyId: req.societyId });
  if (!meeting) throw new ApiError(404, "Meeting not found");
  res.json({ success: true, meeting });
});

export const createMeeting = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, any>;
  if (!body.title || !String(body.title).trim()) throw new ApiError(400, "Title is required");
  if (!body.date) throw new ApiError(400, "Date is required");

  const type = (body.type || "general_body") as MeetingType;
  if (!TYPES.includes(type)) throw new ApiError(400, "Invalid meeting type");

  const meeting = await Meeting.create({
    societyId: req.societyId,
    title: String(body.title).trim(),
    type,
    date: new Date(body.date),
    time: body.time,
    venue: body.venue,
    agenda: body.agenda,
    status: "upcoming",
    minutes: body.minutes,
    minutesFile: req.file ? fileUrl("meetings", req.file.filename) : undefined,
    attendeesCount: body.attendeesCount !== undefined ? Number(body.attendeesCount) || 0 : 0,
    isPublished: parseBool(body.isPublished, false),
  });

  res.status(201).json({ success: true, meeting });
});

export const updateMeeting = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid meeting id");

  const meeting = await Meeting.findOne({ _id: id, societyId: req.societyId });
  if (!meeting) throw new ApiError(404, "Meeting not found");

  const body = req.body as Record<string, any>;
  if (body.title !== undefined) {
    if (!String(body.title).trim()) throw new ApiError(400, "Title is required");
    meeting.title = String(body.title).trim();
  }
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type)) throw new ApiError(400, "Invalid meeting type");
    meeting.type = body.type;
  }
  if (body.date !== undefined && body.date !== "") meeting.date = new Date(body.date);
  if (body.time !== undefined) meeting.time = body.time;
  if (body.venue !== undefined) meeting.venue = body.venue;
  if (body.agenda !== undefined) meeting.agenda = body.agenda;
  if (body.minutes !== undefined) meeting.minutes = body.minutes;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw new ApiError(400, "Invalid status");
    meeting.status = body.status;
  }
  if (body.attendeesCount !== undefined) meeting.attendeesCount = Number(body.attendeesCount) || 0;
  if (body.isPublished !== undefined) meeting.isPublished = parseBool(body.isPublished, meeting.isPublished);

  if (req.file) {
    removeFile(meeting.minutesFile);
    meeting.minutesFile = fileUrl("meetings", req.file.filename);
  }

  await meeting.save();
  res.json({ success: true, meeting });
});

export const deleteMeeting = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid meeting id");

  const meeting = await Meeting.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!meeting) throw new ApiError(404, "Meeting not found");

  removeFile(meeting.minutesFile);
  res.json({ success: true, message: "Meeting deleted" });
});

export const toggleMeetingPublish = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid meeting id");

  const meeting = await Meeting.findOne({ _id: id, societyId: req.societyId });
  if (!meeting) throw new ApiError(404, "Meeting not found");

  const body = req.body as Record<string, any>;
  meeting.isPublished =
    body.isPublished === undefined ? !meeting.isPublished : parseBool(body.isPublished, meeting.isPublished);
  await meeting.save();

  res.json({ success: true, meeting });
});

export const updateMeetingMinutes = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid meeting id");

  const meeting = await Meeting.findOne({ _id: id, societyId: req.societyId });
  if (!meeting) throw new ApiError(404, "Meeting not found");

  const body = req.body as Record<string, any>;
  if (body.minutes !== undefined) meeting.minutes = body.minutes;
  if (body.attendeesCount !== undefined) meeting.attendeesCount = Number(body.attendeesCount) || 0;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw new ApiError(400, "Invalid status");
    meeting.status = body.status;
  }

  if (req.file) {
    removeFile(meeting.minutesFile);
    meeting.minutesFile = fileUrl("meetings", req.file.filename);
  }

  await meeting.save();
  res.json({ success: true, meeting });
});