import mongoose, { Schema, Model } from "mongoose";

export interface IEvent {
  societyId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  time?: string;
  venue?: string;
  image?: string;
  isPublished: boolean;
}

const eventSchema = new Schema<IEvent>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    date: { type: Date, required: true },
    endDate: { type: Date },
    time: { type: String },
    venue: { type: String },
    image: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ societyId: 1, isPublished: 1, date: 1 });

const Event: Model<IEvent> = mongoose.model<IEvent>("Event", eventSchema);

export default Event;