import mongoose, { Schema, Model } from "mongoose";

export type PeriodType = "yearly" | "monthly" | "quarterly";
export type DueStatus = "pending" | "partial" | "paid" | "cancelled";

export interface IMaintenanceDue {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  year: number;
  periodType: PeriodType;
  periodNo: number;
  periodLabel: string;
  amount: number;
  dueDate: Date;
  paidPrincipal: number;
  lateFeePaid: number;
  lateFeeWaived: number;
  status: DueStatus;
  waiveReason?: string;
  waivedAt?: Date;
  waivedBy?: string;
}

const maintenanceDueSchema = new Schema<IMaintenanceDue>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    year: { type: Number, required: true },
    periodType: { type: String, enum: ["yearly", "monthly", "quarterly"], required: true },
    periodNo: { type: Number, required: true, default: 0 },
    periodLabel: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidPrincipal: { type: Number, default: 0, min: 0 },
    lateFeePaid: { type: Number, default: 0, min: 0 },
    lateFeeWaived: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["pending", "partial", "paid", "cancelled"], default: "pending" },
    waiveReason: { type: String },
    waivedAt: { type: Date },
    waivedBy: { type: String },
  },
  { timestamps: true }
);

maintenanceDueSchema.index(
  { societyId: 1, houseId: 1, year: 1, periodType: 1, periodNo: 1 },
  { unique: true }
);
maintenanceDueSchema.index({ societyId: 1, year: 1, status: 1 });

const MaintenanceDue: Model<IMaintenanceDue> =
  mongoose.model<IMaintenanceDue>("MaintenanceDue", maintenanceDueSchema);

export default MaintenanceDue;