import mongoose, { Schema, Model } from "mongoose";

export interface IBodyMember {
  societyId: mongoose.Types.ObjectId;
  name: string;
  designation: string;
  photo?: string;
  phone?: string;
  email?: string;
  order: number;
  isActive: boolean;
}

const bodyMemberSchema = new Schema<IBodyMember>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    photo: { type: String },
    phone: { type: String },
    email: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const BodyMember: Model<IBodyMember> = mongoose.model<IBodyMember>(
  "BodyMember",
  bodyMemberSchema
);

export default BodyMember;