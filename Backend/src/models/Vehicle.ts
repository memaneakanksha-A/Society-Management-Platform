import mongoose, { Schema, Model, Document } from "mongoose";

export type VehicleType = "two_wheeler" | "four_wheeler" | "cycle" | "other";
export type OwnerType = "owner" | "tenant";

export interface IVehicle extends Document {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  ownerType: OwnerType;
  ownerRefId: mongoose.Types.ObjectId;
  type: VehicleType;
  vehicleNo: string;
  make?: string;
  vehicleModel?: string;
  colour?: string;
  parkingSlot?: string;
  stickerNo?: string;
  isActive: boolean;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    ownerType: { type: String, enum: ["owner", "tenant"], required: true },
    ownerRefId: { type: Schema.Types.ObjectId, required: true, refPath: "ownerType" },
    type: { type: String, enum: ["two_wheeler", "four_wheeler", "cycle", "other"], required: true },
    vehicleNo: { type: String, required: true, trim: true, uppercase: true },
    make: { type: String, trim: true },
    vehicleModel: { type: String, trim: true },
    colour: { type: String, trim: true },
    parkingSlot: { type: String, trim: true },
    stickerNo: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
vehicleSchema.index({ societyId: 1, vehicleNo: 1 }, { unique: true });
vehicleSchema.index({ societyId: 1, houseId: 1 });
vehicleSchema.index({ societyId: 1, ownerType: 1, ownerRefId: 1 });

const Vehicle: Model<IVehicle> = mongoose.model<IVehicle>("Vehicle", vehicleSchema);

export default Vehicle;