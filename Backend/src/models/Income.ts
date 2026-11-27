import mongoose, { Schema, Model } from "mongoose";

export type IncomeSource = "interest" | "hall_rent" | "penalty" | "donation" | "scrap" | "other";
export type IncomeStatus = "active" | "cancelled";
export type PaymentMode = "cash" | "upi" | "cheque" | "bank_transfer" | "card" | "other";

export interface IIncome {
  societyId: mongoose.Types.ObjectId;
  date: Date;
  source: IncomeSource;
  title: string;
  amount: number;
  mode: PaymentMode;
  referenceNo?: string;
  receivedFrom?: string;
  remarks?: string;
  incomeNo: string;
  status: IncomeStatus;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdBy?: string;
}

const incomeSchema = new Schema<IIncome>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    date: { type: Date, required: true },
    source: {
      type: String,
      enum: ["interest", "hall_rent", "penalty", "donation", "scrap", "other"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    mode: {
      type: String,
      enum: ["cash", "upi", "cheque", "bank_transfer", "card", "other"],
      required: true,
    },
    referenceNo: { type: String },
    receivedFrom: { type: String, trim: true },
    remarks: { type: String },
    incomeNo: { type: String, required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    cancelReason: { type: String },
    cancelledAt: { type: Date },
    cancelledBy: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

incomeSchema.index({ societyId: 1, incomeNo: 1 }, { unique: true });
incomeSchema.index({ societyId: 1, date: -1 });

const Income: Model<IIncome> = mongoose.model<IIncome>("Income", incomeSchema);

export default Income;