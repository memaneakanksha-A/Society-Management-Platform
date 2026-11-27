import mongoose, { Schema, Model, Document } from "mongoose";

export type ComplaintCategory =
  | "water"
  | "electricity"
  | "road"
  | "lift"
  | "security"
  | "parking"
  | "noise"
  | "neighbour"
  | "cleanliness"
  | "other";

export type ComplaintPriority = "low" | "medium" | "high";
export type ComplaintStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "rejected";

export interface IComplaintHistory {
  status: ComplaintStatus;
  note?: string;
  byName: string;
  at: Date;
}

export interface IComplaint extends Document {
  societyId: mongoose.Types.ObjectId;
  complaintNo: string;
  houseId: mongoose.Types.ObjectId;
  raisedByUserId?: mongoose.Types.ObjectId;
  raisedByName: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  photos: string[];
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTo?: string;
  history: IComplaintHistory[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema<IComplaintHistory>(
  {
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed", "rejected"],
      required: true,
    },
    note: { type: String, trim: true },
    byName: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new Schema<IComplaint>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    complaintNo: { type: String, required: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    raisedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    raisedByName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        "water",
        "electricity",
        "road",
        "lift",
        "security",
        "parking",
        "noise",
        "neighbour",
        "cleanliness",
        "other",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    photos: { type: [String], default: [] },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed", "rejected"],
      default: "open",
    },
    assignedTo: { type: String, trim: true },
    history: { type: [historySchema], default: [] },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

complaintSchema.index({ societyId: 1, status: 1 });
complaintSchema.index({ societyId: 1, complaintNo: 1 }, { unique: true });

const Complaint: Model<IComplaint> = mongoose.model<IComplaint>("Complaint", complaintSchema);

export default Complaint;