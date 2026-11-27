import mongoose, { Schema, Model } from "mongoose";

export type MaintenanceFrequency = "yearly" | "monthly" | "quarterly";
export type LateFeeType = "flat" | "percent";
export type LateFeeRepeat = "once" | "monthly";

export interface IAmountByHouseType {
  houseTypeId: mongoose.Types.ObjectId;
  amount: number;
}

export interface ILateFeeConfig {
  enabled: boolean;
  type: LateFeeType;
  value: number;
  graceDays: number;
  repeat: LateFeeRepeat;
}

export interface IMaintenanceConfig {
  societyId: mongoose.Types.ObjectId;
  year: number;
  frequency: MaintenanceFrequency;
  dueDay?: number;
  dueDate?: string;
  amounts: IAmountByHouseType[];
  lateFee: ILateFeeConfig;
  shareAmountPerHouse?: number;
}

const amountSchema = new Schema<IAmountByHouseType>(
  {
    houseTypeId: { type: Schema.Types.ObjectId, ref: "HouseType", required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const lateFeeSchema = new Schema<ILateFeeConfig>(
  {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ["flat", "percent"], default: "flat" },
    value: { type: Number, default: 0, min: 0 },
    graceDays: { type: Number, default: 0, min: 0 },
    repeat: { type: String, enum: ["once", "monthly"], default: "once" },
  },
  { _id: false }
);

const maintenanceConfigSchema = new Schema<IMaintenanceConfig>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    year: { type: Number, required: true },
    frequency: { type: String, enum: ["yearly", "monthly", "quarterly"], required: true },
    dueDay: { type: Number, min: 1, max: 28 },
    dueDate: { type: String },
    amounts: { type: [amountSchema], default: [] },
    lateFee: { type: lateFeeSchema, default: () => ({ enabled: false, type: "flat", value: 0, graceDays: 0, repeat: "once" }) },
    shareAmountPerHouse: { type: Number, min: 0 },
  },
  { timestamps: true }
);

maintenanceConfigSchema.index({ societyId: 1, year: 1 }, { unique: true });

const MaintenanceConfig: Model<IMaintenanceConfig> =
  mongoose.model<IMaintenanceConfig>("MaintenanceConfig", maintenanceConfigSchema);

export default MaintenanceConfig;