import mongoose, { Schema, Model, Document } from "mongoose";

export type TenantStatus = "active" | "vacated";
export type PoliceVerificationStatus = "pending" | "done" | "not_required";
export type AgreementState = "valid" | "expiring_soon" | "expired";

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IAgreementHistory {
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  depositAmount: number;
  file?: string;
  renewedAt: Date;
}

export interface ITenantDocuments {
  aadhaar?: string;
  agreement?: string;
  policeVerification?: string;
  photo?: string;
}

export interface ITenant extends Document {
  societyId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  membersCount?: number;
  occupation?: string;
  workplace?: string;
  permanentAddress?: string;
  emergencyContact?: IEmergencyContact;
  idProofType?: string;
  idProofNumber?: string;
  rentAmount: number;
  depositAmount: number;
  agreementStartDate: Date;
  agreementEndDate: Date;
  agreements: IAgreementHistory[];
  policeVerification: {
    status: PoliceVerificationStatus;
    date?: Date;
    remarks?: string;
  };
  documents: ITenantDocuments;
  status: TenantStatus;
  vacatedOn?: Date;
  vacateReason?: string;
  remarks?: string;
  whatsappOptIn?: boolean;
  optOutAt?: Date;

  // Computed properties (virtuals)
  agreementState: AgreementState;
  daysLeft: number;
}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true },
  },
  { _id: false }
);

const agreementHistorySchema = new Schema<IAgreementHistory>(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    rentAmount: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    file: { type: String },
    renewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const documentsSchema = new Schema<ITenantDocuments>(
  {
    aadhaar: { type: String },
    agreement: { type: String },
    policeVerification: { type: String },
    photo: { type: String },
  },
  { _id: false }
);

const tenantSchema = new Schema<ITenant>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "Owner" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    altPhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    membersCount: { type: Number, min: 0 },
    occupation: { type: String, trim: true },
    workplace: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    emergencyContact: emergencyContactSchema,
    idProofType: { type: String, trim: true },
    idProofNumber: { type: String, trim: true },
    rentAmount: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, min: 0 },
    agreementStartDate: { type: Date, required: true },
    agreementEndDate: { type: Date, required: true },
    agreements: { type: [agreementHistorySchema], default: [] },
    policeVerification: {
      status: {
        type: String,
        enum: ["pending", "done", "not_required"],
        default: "pending",
      },
      date: { type: Date },
      remarks: { type: String, trim: true },
    },
    documents: { type: documentsSchema, default: {} },
    status: { type: String, enum: ["active", "vacated"], default: "active" },
    vacatedOn: { type: Date },
    vacateReason: { type: String, trim: true },
    remarks: { type: String, trim: true },
    whatsappOptIn: { type: Boolean, default: true },
    optOutAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
tenantSchema.index({ societyId: 1, houseId: 1 });
tenantSchema.index({ societyId: 1, status: 1 });
tenantSchema.index({ societyId: 1, agreementEndDate: 1 });

// Virtual for agreementState
tenantSchema.virtual("agreementState").get(function (this: ITenant): AgreementState {
  if (this.status === "vacated") return "valid";
  const today = new Date();
  const endDate = new Date(this.agreementEndDate);
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "valid";
});

// Virtual for daysLeft
tenantSchema.virtual("daysLeft").get(function (this: ITenant): number {
  const today = new Date();
  const endDate = new Date(this.agreementEndDate);
  const diffTime = endDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
tenantSchema.set("toJSON", { virtuals: true });
tenantSchema.set("toObject", { virtuals: true });

// Ensure only one active tenant per house
tenantSchema.index(
  { houseId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

const Tenant: Model<ITenant> = mongoose.model<ITenant>("Tenant", tenantSchema);

export default Tenant;