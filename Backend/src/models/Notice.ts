import mongoose, { Schema, Model } from "mongoose";

export type NoticeCategory =
  | "general"
  | "maintenance"
  | "water"
  | "security"
  | "legal"
  | "event"
  | "other";
export type NoticeVisibility = "public" | "members";

export interface INotice {
  societyId: mongoose.Types.ObjectId;
  title: string;
  body?: string;
  category: NoticeCategory;
  attachment?: string;
  isImportant: boolean;
  publishOn?: Date;
  expiresOn?: Date;
  visibility: NoticeVisibility;
  isPublished: boolean;
}

const noticeSchema = new Schema<INotice>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String },
    category: {
      type: String,
      enum: ["general", "maintenance", "water", "security", "legal", "event", "other"],
      default: "general",
    },
    attachment: { type: String },
    isImportant: { type: Boolean, default: false },
    publishOn: { type: Date },
    expiresOn: { type: Date },
    visibility: { type: String, enum: ["public", "members"], default: "public" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

noticeSchema.index({ societyId: 1, isPublished: 1, isImportant: -1, publishOn: -1 });

const Notice: Model<INotice> = mongoose.model<INotice>("Notice", noticeSchema);

export default Notice;