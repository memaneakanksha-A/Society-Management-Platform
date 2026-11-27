import mongoose, { Schema, Model } from "mongoose";

export type HouseDocumentType =
  | "sale_deed"
  | "share_certificate"
  | "noc"
  | "id_proof"
  | "tax_bill"
  | "electricity_bill"
  | "other";

export type HouseDocumentStatus = "active" | "deleted";

export interface IHouseDocument {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  title: string;
  docType: HouseDocumentType;
  file: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
  notes?: string;
  status: HouseDocumentStatus;
  deletedAt?: Date;
  deletedBy?: string;
}

const houseDocumentSchema = new Schema<IHouseDocument>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    title: { type: String, required: true, trim: true },
    docType: {
      type: String,
      enum: ["sale_deed", "share_certificate", "noc", "id_proof", "tax_bill", "electricity_bill", "other"],
      default: "other",
    },
    file: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String },
    notes: { type: String },
    status: { type: String, enum: ["active", "deleted"], default: "active" },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true }
);

houseDocumentSchema.index({ societyId: 1, houseId: 1, status: 1 });

const HouseDocument: Model<IHouseDocument> = mongoose.model<IHouseDocument>(
  "HouseDocument",
  houseDocumentSchema
);

export default HouseDocument;