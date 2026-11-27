import mongoose, { Schema, Model, Document } from "mongoose";

export type Gender = "male" | "female" | "other";

export interface IFamilyMember extends Document {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  name: string;
  relation: string;
  gender: Gender;
  dob?: Date;
  age?: number;
  phone?: string;
  bloodGroup?: string;
  occupation?: string;
  isEmergencyContact: boolean;
}

const familyMemberSchema = new Schema<IFamilyMember>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date },
    age: { type: Number, min: 0 },
    phone: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    occupation: { type: String, trim: true },
    isEmergencyContact: { type: Boolean, default: false },
  },
  { timestamps: true }
);

familyMemberSchema.index({ societyId: 1, houseId: 1 });

const FamilyMember: Model<IFamilyMember> = mongoose.model<IFamilyMember>("FamilyMember", familyMemberSchema);

export default FamilyMember;