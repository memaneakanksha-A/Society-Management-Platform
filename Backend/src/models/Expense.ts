import mongoose, { Schema, Model } from "mongoose";

export type PaymentMode = "cash" | "upi" | "cheque" | "bank_transfer" | "card" | "other";
export type ExpenseStatus = "active" | "cancelled";

export interface IExpense {
  societyId: mongoose.Types.ObjectId;
  date: Date;
  categoryId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  amount: number;
  paidTo?: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  billNo?: string;
  isPettyCash: boolean;
  attachment?: string;
  voucherNo: string;
  approvedBy?: string;
  status: ExpenseStatus;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdBy?: string;
}

const expenseSchema = new Schema<IExpense>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    date: { type: Date, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "ExpenseCategory", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    amount: { type: Number, required: true, min: 0 },
    paidTo: { type: String, trim: true },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "cheque", "bank_transfer", "card", "other"],
      required: true,
    },
    referenceNo: { type: String },
    billNo: { type: String },
    isPettyCash: { type: Boolean, default: false },
    attachment: { type: String },
    voucherNo: { type: String, required: true },
    approvedBy: { type: String },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    cancelReason: { type: String },
    cancelledAt: { type: Date },
    cancelledBy: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

expenseSchema.index({ societyId: 1, voucherNo: 1 }, { unique: true });
expenseSchema.index({ societyId: 1, date: -1 });

const Expense: Model<IExpense> = mongoose.model<IExpense>("Expense", expenseSchema);

export default Expense;