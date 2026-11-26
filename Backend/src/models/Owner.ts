import mongoose, { Schema, Model } from "mongoose";

export interface IOwner {
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
}

const ownerSchema = new Schema<IOwner>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String },
    altPhone: { type: String },
    email: { type: String },
    idProofType: { type: String },
    idProofNumber: { type: String },
    fromDate: { type: Date, default: Date.now },
    toDate: { type: Date },
    isCurrent: { type: Boolean, default: true },
    transferNote: { type: String },
  },
  { timestamps: true }
);

const Owner: Model<IOwner> = mongoose.model<IOwner>("Owner", ownerSchema);

export default Owner;