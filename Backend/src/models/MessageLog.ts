import mongoose, { Schema, Model } from "mongoose";

export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "skipped";

export interface IMessageLog {
  societyId: mongoose.Types.ObjectId;
  campaignId?: string;
  houseId?: mongoose.Types.ObjectId;
  recipientType: "owner" | "tenant";
  recipientName?: string;
  phone: string;
  templateKey?: string;
  language?: "en" | "hi";
  renderedText?: string;
  variables?: Record<string, unknown>;
  status: MessageStatus;
  skipReason?: string;
  providerMessageId?: string;
  error?: string;
  attempts: number;
  scheduledAt?: Date;
  sentAt?: Date;
  idempotencyKey?: string;
  createdBy?: string;
}

const messageLogSchema = new Schema<IMessageLog>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    campaignId: { type: String, trim: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House" },
    recipientType: { type: String, enum: ["owner", "tenant"], required: true },
    recipientName: { type: String, trim: true },
    phone: { type: String, required: true },
    templateKey: { type: String, trim: true },
    language: { type: String, enum: ["en", "hi"] },
    renderedText: { type: String },
    variables: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "read", "failed", "skipped"],
      default: "queued",
    },
    skipReason: { type: String },
    providerMessageId: { type: String, index: true },
    error: { type: String },
    attempts: { type: Number, default: 0 },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    idempotencyKey: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

messageLogSchema.index(
  { societyId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

const MessageLog: Model<IMessageLog> = mongoose.model<IMessageLog>(
  "WhatsAppMessageLog",
  messageLogSchema
);

async function cleanupAndSyncIndexes() {
  try {
    const indexes = await MessageLog.collection.indexes();
    const old = indexes.find((idx) => idx.name === "societyId_1_idempotencyKey_1");
    if (old) {
      await MessageLog.collection.dropIndex("societyId_1_idempotencyKey_1");
    }
  } catch (err) {
  }

  try {
    await MessageLog.syncIndexes();
  } catch (err) {
  }
}

cleanupAndSyncIndexes();

export default MessageLog;