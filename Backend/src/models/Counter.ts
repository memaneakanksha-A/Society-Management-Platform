import mongoose, { Schema, Model } from "mongoose";

export interface ICounter {
  societyId: mongoose.Types.ObjectId;
  key: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    key: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

counterSchema.index({ societyId: 1, key: 1 }, { unique: true });

const Counter: Model<ICounter> = mongoose.model<ICounter>("Counter", counterSchema);

export const nextSeq = async (societyId: string, key: string): Promise<number> => {
  const counter = await Counter.findOneAndUpdate(
    { societyId, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter!.seq;
};

export default Counter;