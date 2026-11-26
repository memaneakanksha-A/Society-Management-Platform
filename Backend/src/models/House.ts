import mongoose, { Schema, Model } from "mongoose";

export type OccupancyStatus = "owner_living" | "rented" | "vacant";
export type MaintenancePayableBy = "owner" | "tenant";

export interface IHouse {
  societyId: mongoose.Types.ObjectId;
  houseTypeId: mongoose.Types.ObjectId;
  houseNo: string;
  area?: number;
  location?: string;
  occupancyStatus: OccupancyStatus;
  maintenancePayableBy: MaintenancePayableBy;
  currentOwnerId?: mongoose.Types.ObjectId;
  currentTenantId?: mongoose.Types.ObjectId;
  notes?: string;
}

const houseSchema = new Schema<IHouse>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseTypeId: { type: Schema.Types.ObjectId, ref: "HouseType", required: true },
    houseNo: { type: String, required: true, trim: true, uppercase: true },
    area: { type: Number },
    location: { type: String },
    occupancyStatus: {
      type: String,
      enum: ["owner_living", "rented", "vacant"],
      default: "owner_living",
    },
    maintenancePayableBy: { type: String, enum: ["owner", "tenant"], default: "owner" },
    currentOwnerId: { type: Schema.Types.ObjectId, ref: "Owner" },
    currentTenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    notes: { type: String },
  },
  { timestamps: true }
);

houseSchema.index({ societyId: 1, houseNo: 1 }, { unique: true });

const House: Model<IHouse> = mongoose.model<IHouse>("House", houseSchema);

export default House;