import mongoose, { Schema, Model, Document } from "mongoose";

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IOwner extends Document {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  idProofType?: string;
  idProofNumber?: string;
  fromDate: Date;
  toDate?: Date;
  isCurrent: boolean;
  transferNote?: string;
  emergencyContact?: IEmergencyContact;
}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true },
  },
  { _id: false }
);

const ownerSchema = new Schema<IOwner>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    altPhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    idProofType: { type: String, trim: true },
    idProofNumber: { type: String, trim: true },
    fromDate: { type: Date, default: Date.now },
    toDate: { type: Date },
    isCurrent: { type: Boolean, default: true },
    transferNote: { type: String, trim: true },
    emergencyContact: emergencyContactSchema,
  },
  { timestamps: true }
);

ownerSchema.index({ societyId: 1, houseId: 1 });

const Owner: Model<IOwner> = mongoose.model<IOwner>("Owner", ownerSchema);

export default Owner;