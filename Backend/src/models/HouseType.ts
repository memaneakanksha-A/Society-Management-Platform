import mongoose, { Schema, Model } from "mongoose";

export type HouseTypeCategory = "bungalow" | "flat" | "rk" | "other";

export interface IHouseType {
  societyId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  category: HouseTypeCategory;
  defaultMaintenanceAmount: number;
}

const houseTypeSchema = new Schema<IHouseType>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["bungalow", "flat", "rk", "other"],
      default: "bungalow",
    },
    defaultMaintenanceAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

houseTypeSchema.index({ societyId: 1, code: 1 }, { unique: true });

const HouseType: Model<IHouseType> = mongoose.model<IHouseType>("HouseType", houseTypeSchema);

export default HouseType;