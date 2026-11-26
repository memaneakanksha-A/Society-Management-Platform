import mongoose, { Schema, Model } from "mongoose";

export interface ISociety {
  name: string;
  slug: string;
  address?: string;
  logo?: string;
  totalHouses: number;
  about?: string;
  contact?: {
    phone?: string;
    email?: string;
    mapUrl?: string;
  };
  officeTime?: string;
  status: "active" | "inactive";
}

const societySchema = new Schema<ISociety>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String },
    logo: { type: String },
    totalHouses: { type: Number, default: 0 },
    about: { type: String },
    contact: {
      phone: { type: String },
      email: { type: String },
      mapUrl: { type: String },
    },
    officeTime: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

const Society: Model<ISociety> = mongoose.model<ISociety>("Society", societySchema);

export default Society;