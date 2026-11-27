import mongoose, { Schema, Model } from "mongoose";

export type WhatsAppTemplateKey =
  | "payment_thanks"
  | "payment_cancelled"
  | "dues_reminder"
  | "dues_overdue"
  | "share_pending"
  | "rent_expiry"
  | "complaint_update"
  | "certificate_ready"
  | "notice_published"
  | "event_published"
  | "meeting_notice"
  | "meeting_reminder"
  | "general_broadcast";

export type WhatsAppTemplateStatus = "draft" | "pending" | "approved" | "rejected";

export interface IWhatsAppTemplate {
  societyId: mongoose.Types.ObjectId;
  key: WhatsAppTemplateKey;
  language: "en" | "hi";
  body: string;
  variables: string[];
  category: "utility";
  providerTemplateName?: string;
  providerLanguageCode?: string;
  status: WhatsAppTemplateStatus;
  isActive: boolean;
}

const whatsAppTemplateSchema = new Schema<IWhatsAppTemplate>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    key: {
      type: String,
      enum: [
        "payment_thanks",
        "payment_cancelled",
        "dues_reminder",
        "dues_overdue",
        "share_pending",
        "rent_expiry",
        "complaint_update",
        "certificate_ready",
        "notice_published",
        "event_published",
        "meeting_notice",
        "meeting_reminder",
        "general_broadcast",
      ],
      required: true,
    },
    language: { type: String, enum: ["en", "hi"], required: true },
    body: { type: String, required: true },
    variables: { type: [String], default: [] },
    category: { type: String, enum: ["utility"], default: "utility" },
    providerTemplateName: { type: String, trim: true },
    providerLanguageCode: { type: String, trim: true },
    status: { type: String, enum: ["draft", "pending", "approved", "rejected"], default: "draft" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

whatsAppTemplateSchema.index({ societyId: 1, key: 1, language: 1 }, { unique: true });

const WhatsAppTemplate: Model<IWhatsAppTemplate> = mongoose.model<IWhatsAppTemplate>(
  "WhatsAppTemplate",
  whatsAppTemplateSchema
);

export default WhatsAppTemplate;