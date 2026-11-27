import mongoose, { Schema, Model } from "mongoose";

export type WhatsAppProviderName = "cloud" | "manual";
export type WhatsAppSendTo = "payer" | "owner" | "both";
export type WhatsAppLanguage = "en" | "hi" | "both";

export interface IQuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface IWhatsAppSetting {
  societyId: mongoose.Types.ObjectId;
  provider: WhatsAppProviderName;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessTokenEnc?: string;
  enabled: boolean;
  sendTo: WhatsAppSendTo;
  language: WhatsAppLanguage;
  quietHours: IQuietHours;
  dailyLimit: number;
  testMode: boolean;
}

const quietHoursSchema = new Schema<IQuietHours>(
  {
    enabled: { type: Boolean, default: true },
    start: { type: String, default: "21:00" },
    end: { type: String, default: "08:00" },
  },
  { _id: false }
);

const whatsAppSettingSchema = new Schema<IWhatsAppSetting>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, unique: true, index: true },
    provider: { type: String, enum: ["cloud", "manual"], default: "manual" },
    phoneNumberId: { type: String, trim: true },
    businessAccountId: { type: String, trim: true },
    accessTokenEnc: { type: String, select: false },
    enabled: { type: Boolean, default: false },
    sendTo: { type: String, enum: ["payer", "owner", "both"], default: "both" },
    language: { type: String, enum: ["en", "hi", "both"], default: "en" },
    quietHours: { type: quietHoursSchema, default: { enabled: true, start: "21:00", end: "08:00" } },
    dailyLimit: { type: Number, default: 500 },
    testMode: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const WhatsAppSetting: Model<IWhatsAppSetting> = mongoose.model<IWhatsAppSetting>(
  "WhatsAppSetting",
  whatsAppSettingSchema
);

export default WhatsAppSetting;