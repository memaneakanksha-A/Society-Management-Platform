import mongoose, { Schema, Model } from "mongoose";

export interface IExpenseCategory {
  societyId: mongoose.Types.ObjectId;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

expenseCategorySchema.index({ societyId: 1, name: 1 }, { unique: true });

const ExpenseCategory: Model<IExpenseCategory> = mongoose.model<IExpenseCategory>(
  "ExpenseCategory",
  expenseCategorySchema
);

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Electricity",
  "Water",
  "Security Salary",
  "Housekeeping",
  "Repairs & Maintenance",
  "Gardening",
  "Lift",
  "Stationery & Printing",
  "Festival & Events",
  "Legal & Audit",
  "Insurance",
  "Petty Cash",
  "Miscellaneous",
];

export default ExpenseCategory;