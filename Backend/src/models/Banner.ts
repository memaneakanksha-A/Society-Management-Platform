import mongoose, { Schema, Model } from "mongoose";

export interface IBanner {
  societyId: mongoose.Types.ObjectId;
  title: string;
  subtitle?: string;
  image: string;
  order: number;
  isActive: boolean;
}

const bannerSchema = new Schema<IBanner>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String },
    image: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Banner: Model<IBanner> = mongoose.model<IBanner>("Banner", bannerSchema);

export default Banner;