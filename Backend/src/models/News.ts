import mongoose, { Schema, Model } from "mongoose";

export interface INews {
  societyId: mongoose.Types.ObjectId;
  title: string;
  summary?: string;
  body?: string;
  image?: string;
  date: Date;
  isPublished: boolean;
  isPinned: boolean;
}

const newsSchema = new Schema<INews>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String },
    body: { type: String },
    image: { type: String },
    date: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

newsSchema.index({ societyId: 1, isPublished: 1, date: -1 });

const News: Model<INews> = mongoose.model<INews>("News", newsSchema);

export default News;