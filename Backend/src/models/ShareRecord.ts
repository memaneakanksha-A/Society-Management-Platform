import mongoose, { Schema, Model } from "mongoose";

export type ShareStatus = "pending" | "partial" | "paid";

export interface IShareRecord {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  totalAmount: number;
  paidAmount: number;
  status: ShareStatus;
  certificateNo?: string;
  issueDate?: Date;
  remarks?: string;
}

const shareRecordSchema = new Schema<IShareRecord>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true },
    totalAmount: { type: Number, required: true, default: 0, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: ["pending", "partial", "paid"], default: "pending" },
    certificateNo: { type: String },
    issueDate: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

shareRecordSchema.index({ societyId: 1, houseId: 1 }, { unique: true });
shareRecordSchema.index({ societyId: 1, status: 1 });

const ShareRecord: Model<IShareRecord> = mongoose.model<IShareRecord>("ShareRecord", shareRecordSchema);

export default ShareRecord;