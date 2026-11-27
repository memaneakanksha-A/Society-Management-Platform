import { Request, Response } from "express";
import mongoose from "mongoose";
import Society, { ISociety } from "../../models/Society";
import Banner from "../../models/Banner";
import BodyMember from "../../models/BodyMember";
import GalleryAlbum from "../../models/GalleryAlbum";
import GalleryImage from "../../models/GalleryImage";
import News from "../../models/News";
import EventModel from "../../models/Event";
import Meeting from "../../models/Meeting";
import Notice from "../../models/Notice";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const getActiveSociety = async (slug: string | string[]): Promise<mongoose.HydratedDocument<ISociety>> => {
  const value = Array.isArray(slug) ? slug[0] : slug;
  const society = await Society.findOne({ slug: value.toLowerCase(), status: "active" });
  if (!society) throw new ApiError(404, "Society not found");
  return society;
};

const publicSociety = (society: ISociety) => ({
  name: society.name,
  slug: society.slug,
  address: society.address,
  logo: society.logo,
  about: society.about,
  contact: {
    phone: society.contact?.phone,
    email: society.contact?.email,
    mapUrl: society.contact?.mapUrl,
  },
  officeTime: society.officeTime,
});

export const getPublicSociety = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  res.json({ success: true, society: publicSociety(society) });
});

export const getPublicBanners = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const banners = await Banner.find({ societyId: society._id, isActive: true })
    .sort({ order: 1 })
    .select("title subtitle image");
  res.json({ success: true, banners });
});

export const getPublicMembers = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const members = await BodyMember.find({ societyId: society._id, isActive: true })
    .sort({ order: 1 })
    .select("name designation photo phone email");
  res.json({ success: true, members });
});

export const getPublicGallery = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const albums = await GalleryAlbum.find({ societyId: society._id }).sort({ createdAt: -1 });
  const result = await Promise.all(
    albums.map(async (album) => {
      const imageCount = await GalleryImage.countDocuments({ albumId: album._id });
      return {
        _id: album._id,
        title: album.title,
        description: album.description,
        coverImage: album.coverImage,
        imageCount,
      };
    })
  );
  res.json({ success: true, albums: result });
});

export const getPublicAlbumImages = asyncHandler(async (req: Request, res: Response) => {
  const { slug, albumId } = req.params;
  if (!mongoose.isValidObjectId(albumId)) throw new ApiError(400, "Invalid album id");

  const society = await getActiveSociety(slug);
  const album = await GalleryAlbum.findOne({ _id: albumId, societyId: society._id });
  if (!album) throw new ApiError(404, "Album not found");

  const images = await GalleryImage.find({ albumId: album._id, societyId: society._id })
    .sort({ createdAt: 1 })
    .select("_id imageUrl caption");

  res.json({
    success: true,
    album: {
      _id: album._id,
      title: album.title,
      description: album.description,
      coverImage: album.coverImage,
    },
    images,
  });
});

const publicNewsFields = "_id title summary image date isPinned";
const publicEventFields = "_id title description date endDate time venue image";
const publicMeetingFields =
  "_id title type date time venue agenda status minutes minutesFile attendeesCount";
const publicNoticeFields =
  "_id title body category attachment isImportant publishOn expiresOn";

const publicNoticeFilter = (societyId: mongoose.Types.ObjectId): Record<string, any> => {
  const now = new Date();
  return {
    societyId,
    isPublished: true,
    visibility: "public",
    $and: [
      { $or: [{ expiresOn: null }, { expiresOn: { $gte: now } }] },
      { $or: [{ publishOn: null }, { publishOn: { $lte: now } }] },
    ],
  };
};

export const getPublicNews = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId: society._id, isPublished: true };
  const [news, total] = await Promise.all([
    News.find(filter)
      .sort({ isPinned: -1, date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(publicNewsFields)
      .lean(),
    News.countDocuments(filter),
  ]);

  res.json({ success: true, news, total, page, pages: Math.ceil(total / limit) });
});

export const getPublicNewsItem = asyncHandler(async (req: Request, res: Response) => {
  const { slug, id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid news id");
  const society = await getActiveSociety(slug);
  const news = await News.findOne({ _id: id, societyId: society._id, isPublished: true })
    .select("_id title summary body image date isPinned")
    .lean();
  if (!news) throw new ApiError(404, "News not found");
  res.json({ success: true, news });
});

export const getPublicEvents = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId: society._id, isPublished: true };
  const [events, total] = await Promise.all([
    EventModel.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(publicEventFields)
      .lean(),
    EventModel.countDocuments(filter),
  ]);

  res.json({ success: true, events, total, page, pages: Math.ceil(total / limit) });
});

export const getPublicMeetings = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId: society._id, isPublished: true };
  if (q.status) filter.status = q.status;
  const [meetings, total] = await Promise.all([
    Meeting.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(publicMeetingFields)
      .lean(),
    Meeting.countDocuments(filter),
  ]);

  res.json({ success: true, meetings, total, page, pages: Math.ceil(total / limit) });
});

export const getPublicNotices = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter = publicNoticeFilter(society._id);
  const [notices, total] = await Promise.all([
    Notice.find(filter)
      .sort({ isImportant: -1, publishOn: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(publicNoticeFields)
      .lean(),
    Notice.countDocuments(filter),
  ]);

  res.json({ success: true, notices, total, page, pages: Math.ceil(total / limit) });
});

export const getPublicHome = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);
  const now = new Date();

  const [banners, members, news, events, meetings, notices] = await Promise.all([
    Banner.find({ societyId: society._id, isActive: true })
      .sort({ order: 1 })
      .select("title subtitle image"),
    BodyMember.find({ societyId: society._id, isActive: true })
      .sort({ order: 1 })
      .select("name designation photo phone email"),
    News.find({ societyId: society._id, isPublished: true })
      .sort({ isPinned: -1, date: -1 })
      .limit(3)
      .select(publicNewsFields),
    EventModel.find({ societyId: society._id, isPublished: true, date: { $gte: now } })
      .sort({ date: 1 })
      .limit(3)
      .select(publicEventFields),
    Meeting.find({ societyId: society._id, isPublished: true, status: "upcoming", date: { $gte: now } })
      .sort({ date: 1 })
      .limit(3)
      .select(publicMeetingFields),
    Notice.find(publicNoticeFilter(society._id))
      .sort({ isImportant: -1, publishOn: -1, createdAt: -1 })
      .limit(3)
      .select(publicNoticeFields),
  ]);

  res.json({
    success: true,
    society: publicSociety(society),
    banners,
    members,
    news,
    events,
    meetings,
    notices,
  });
});