import { Request, Response } from "express";
import mongoose from "mongoose";
import Society, { ISociety } from "../../models/Society";
import Banner from "../../models/Banner";
import BodyMember from "../../models/BodyMember";
import GalleryAlbum from "../../models/GalleryAlbum";
import GalleryImage from "../../models/GalleryImage";
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

export const getPublicHome = asyncHandler(async (req: Request, res: Response) => {
  const society = await getActiveSociety(req.params.slug);

  const [banners, members] = await Promise.all([
    Banner.find({ societyId: society._id, isActive: true })
      .sort({ order: 1 })
      .select("title subtitle image"),
    BodyMember.find({ societyId: society._id, isActive: true })
      .sort({ order: 1 })
      .select("name designation photo phone email"),
  ]);

  res.json({
    success: true,
    society: publicSociety(society),
    banners,
    members,
  });
});