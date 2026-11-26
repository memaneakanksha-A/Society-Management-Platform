import { Request, Response } from "express";
import mongoose from "mongoose";
import GalleryAlbum from "../../models/GalleryAlbum";
import GalleryImage from "../../models/GalleryImage";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { fileUrl, removeFile } from "../../middleware/upload";

export const getAlbums = asyncHandler(async (req: Request, res: Response) => {
  const albums = await GalleryAlbum.find({ societyId: req.societyId }).sort({ createdAt: -1 });
  const result = await Promise.all(
    albums.map(async (album) => {
      const imageCount = await GalleryImage.countDocuments({ albumId: album._id });
      return { ...album.toObject(), imageCount };
    })
  );
  res.json({ success: true, albums: result });
});

export const createAlbum = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body as Record<string, any>;
  if (!title) throw new ApiError(400, "Title is required");

  const album = await GalleryAlbum.create({
    societyId: req.societyId,
    title,
    description,
    coverImage: req.file ? fileUrl("gallery", req.file.filename) : undefined,
  });

  res.status(201).json({ success: true, album });
});

export const updateAlbum = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid album id");

  const album = await GalleryAlbum.findOne({ _id: id, societyId: req.societyId });
  if (!album) throw new ApiError(404, "Album not found");

  const { title, description } = req.body as Record<string, any>;
  if (title !== undefined) album.title = title;
  if (description !== undefined) album.description = description;

  if (req.file) {
    removeFile(album.coverImage);
    album.coverImage = fileUrl("gallery", req.file.filename);
  }

  await album.save();
  res.json({ success: true, album });
});

export const deleteAlbum = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid album id");

  const album = await GalleryAlbum.findOneAndDelete({ _id: id, societyId: req.societyId });
  if (!album) throw new ApiError(404, "Album not found");

  const images = await GalleryImage.find({ albumId: id, societyId: req.societyId });
  images.forEach((img) => removeFile(img.imageUrl));
  await GalleryImage.deleteMany({ albumId: id, societyId: req.societyId });

  removeFile(album.coverImage);
  res.json({ success: true, message: "Album deleted" });
});

export const getAlbumImages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid album id");

  const album = await GalleryAlbum.findOne({ _id: id, societyId: req.societyId });
  if (!album) throw new ApiError(404, "Album not found");

  const images = await GalleryImage.find({ albumId: id, societyId: req.societyId }).sort({
    createdAt: 1,
  });
  res.json({ success: true, images });
});

export const uploadAlbumImages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid album id");

  const album = await GalleryAlbum.findOne({ _id: id, societyId: req.societyId });
  if (!album) throw new ApiError(404, "Album not found");

  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) throw new ApiError(400, "At least one image is required");

  const docs = await GalleryImage.create(
    files.map((f) => ({
      societyId: req.societyId,
      albumId: album._id,
      imageUrl: fileUrl("gallery", f.filename),
      caption: (req.body as Record<string, any>)?.caption,
    }))
  );

  if (!album.coverImage && docs.length > 0) {
    album.coverImage = docs[0].imageUrl;
    await album.save();
  }

  res.status(201).json({ success: true, images: docs });
});

export const deleteGalleryImage = asyncHandler(async (req: Request, res: Response) => {
  const { imageId } = req.params;
  if (!mongoose.isValidObjectId(imageId)) throw new ApiError(400, "Invalid image id");

  const image = await GalleryImage.findOneAndDelete({ _id: imageId, societyId: req.societyId });
  if (!image) throw new ApiError(404, "Image not found");

  removeFile(image.imageUrl);
  res.json({ success: true, message: "Image deleted" });
});