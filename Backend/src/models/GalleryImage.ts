import mongoose, { Schema, Model } from "mongoose";

export interface IGalleryImage {
  societyId: mongoose.Types.ObjectId;
  albumId: mongoose.Types.ObjectId;
  imageUrl: string;
  caption?: string;
}

const galleryImageSchema = new Schema<IGalleryImage>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    albumId: { type: Schema.Types.ObjectId, ref: "GalleryAlbum", required: true, index: true },
    imageUrl: { type: String, required: true },
    caption: { type: String },
  },
  { timestamps: true }
);

const GalleryImage: Model<IGalleryImage> = mongoose.model<IGalleryImage>(
  "GalleryImage",
  galleryImageSchema
);

export default GalleryImage;