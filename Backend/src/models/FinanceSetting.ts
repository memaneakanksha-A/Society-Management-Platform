import mongoose, { Schema, Model } from "mongoose";

export interface IFinanceSetting {
  societyId: mongoose.Types.ObjectId;
  year: number;
  openingCash: number;
  openingBank: number;
}

const financeSettingSchema = new Schema<IFinanceSetting>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    year: { type: Number, required: true },
    openingCash: { type: Number, default: 0, min: 0 },
    openingBank: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

financeSettingSchema.index({ societyId: 1, year: 1 }, { unique: true });

const FinanceSetting: Model<IFinanceSetting> = mongoose.model<IFinanceSetting>(
  "FinanceSetting",
  financeSettingSchema
);

export default FinanceSetting;