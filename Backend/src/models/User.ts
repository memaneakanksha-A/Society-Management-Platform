import mongoose, { Schema, Model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type Role = "superadmin" | "admin" | "member" | "tenant";

export interface IUser extends Document {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: Role;
  societyId?: mongoose.Types.ObjectId;
  houseId?: mongoose.Types.ObjectId;
  linkedOwnerId?: mongoose.Types.ObjectId;
  linkedTenantId?: mongoose.Types.ObjectId;
  isActive: boolean;
  mustChangePassword: boolean;
  comparePassword(plain: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      default: undefined,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: undefined,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["superadmin", "admin", "member", "tenant"],
      default: "member",
    },
    societyId: { type: Schema.Types.ObjectId, ref: "Society", default: undefined },
    houseId: { type: Schema.Types.ObjectId, ref: "House", default: undefined },
    linkedOwnerId: { type: Schema.Types.ObjectId, ref: "Owner", default: undefined },
    linkedTenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: undefined },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ societyId: 1, houseId: 1, role: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;