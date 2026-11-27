import mongoose, { Schema, Model } from "mongoose";

export type MeetingType = "general_body" | "committee" | "agm" | "special";
export type MeetingStatus = "upcoming" | "completed" | "cancelled";

export interface IMeeting {
  societyId: mongoose.Types.ObjectId;
  title: string;
  type: MeetingType;
  date: Date;
  time?: string;
  venue?: string;
  agenda?: string;
  status: MeetingStatus;
  minutes?: string;
  minutesFile?: string;
  attendeesCount: number;
  isPublished: boolean;
}

const meetingSchema = new Schema<IMeeting>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["general_body", "committee", "agm", "special"], default: "general_body" },
    date: { type: Date, required: true },
    time: { type: String },
    venue: { type: String },
    agenda: { type: String },
    status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
    minutes: { type: String },
    minutesFile: { type: String },
    attendeesCount: { type: Number, default: 0, min: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

meetingSchema.index({ societyId: 1, isPublished: 1, date: 1 });

const Meeting: Model<IMeeting> = mongoose.model<IMeeting>("Meeting", meetingSchema);

export default Meeting;