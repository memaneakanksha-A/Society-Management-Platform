import mongoose, { Schema, Model } from "mongoose";

export interface IGalleryAlbum {
  societyId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  coverImage?: string;
}

const galleryAlbumSchema = new Schema<IGalleryAlbum>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    coverImage: { type: String },
  },
  { timestamps: true }
);

const GalleryAlbum: Model<IGalleryAlbum> = mongoose.model<IGalleryAlbum>(
  "GalleryAlbum",
  galleryAlbumSchema
);

export default GalleryAlbum;