import mongoose, { Schema, Model, Document } from "mongoose";

export type ServiceRequestType =
  | "noc"
  | "address_proof"
  | "share_certificate"
  | "no_dues_certificate"
  | "other";

export type ServiceRequestStatus = "pending" | "approved" | "rejected" | "issued";

export interface IServiceRequestHistory {
  status: ServiceRequestStatus;
  note?: string;
  byName: string;
  at: Date;
}

export interface IServiceRequest extends Document {
  societyId: mongoose.Types.ObjectId;
  requestNo: string;
  houseId: mongoose.Types.ObjectId;
  requestedByUserId?: mongoose.Types.ObjectId;
  requestedBy: string;
  type: ServiceRequestType;
  purpose: string;
  details?: string;
  status: ServiceRequestStatus;
  adminRemarks?: string;
  documentFile?: string;
  issuedAt?: Date;
  history: IServiceRequestHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema<IServiceRequestHistory>(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "issued"],
      required: true,
    },
    note: { type: String, trim: true },
    byName: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const serviceRequestSchema = new Schema<IServiceRequest>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    requestNo: { type: String, required: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    requestedBy: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["noc", "address_proof", "share_certificate", "no_dues_certificate", "other"],
      required: true,
    },
    purpose: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "issued"],
      default: "pending",
    },
    adminRemarks: { type: String, trim: true },
    documentFile: { type: String },
    issuedAt: { type: Date },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ societyId: 1, status: 1 });
serviceRequestSchema.index({ societyId: 1, requestNo: 1 }, { unique: true });

const ServiceRequest: Model<IServiceRequest> =
  mongoose.model<IServiceRequest>("ServiceRequest", serviceRequestSchema);

export default ServiceRequest;