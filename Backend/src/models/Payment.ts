import mongoose, { Schema, Model } from "mongoose";

export type PaymentKind = "maintenance" | "share" | "other";
export type PaymentMode = "cash" | "upi" | "cheque" | "bank_transfer" | "card" | "other";
export type PaymentStatus = "active" | "cancelled";

export interface IAllocation {
  dueId: mongoose.Types.ObjectId;
  principal: number;
  lateFee: number;
  paidOn: Date;
}

export interface IPayment {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  kind: PaymentKind;
  amount: number;
  mode: PaymentMode;
  transactionId?: string;
  chequeNo?: string;
  chequeDate?: Date;
  bankName?: string;
  paidOn: Date;
  paidBy: "owner" | "tenant";
  payerName?: string;
  payerPhone?: string;
  receiptNo: string;
  allocations: IAllocation[];
  unallocated: number;
  isAdvance: boolean;
  remarks?: string;
  status: PaymentStatus;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdBy?: string;
}

const allocationSchema = new Schema<IAllocation>(
  {
    dueId: { type: Schema.Types.ObjectId, ref: "MaintenanceDue", required: true },
    principal: { type: Number, default: 0, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 },
    paidOn: { type: Date, required: true },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPayment>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    kind: { type: String, enum: ["maintenance", "share", "other"], default: "maintenance" },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["cash", "upi", "cheque", "bank_transfer", "card", "other"], required: true },
    transactionId: { type: String },
    chequeNo: { type: String },
    chequeDate: { type: Date },
    bankName: { type: String },
    paidOn: { type: Date, required: true },
    paidBy: { type: String, enum: ["owner", "tenant"], required: true },
    payerName: { type: String },
    payerPhone: { type: String },
    receiptNo: { type: String, required: true },
    allocations: { type: [allocationSchema], default: [] },
    unallocated: { type: Number, default: 0, min: 0 },
    isAdvance: { type: Boolean, default: false },
    remarks: { type: String },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    cancelReason: { type: String },
    cancelledAt: { type: Date },
    cancelledBy: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ societyId: 1, receiptNo: 1 }, { unique: true });
paymentSchema.index({ societyId: 1, houseId: 1, paidOn: -1 });

const Payment: Model<IPayment> = mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;