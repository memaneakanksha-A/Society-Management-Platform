import mongoose, { Schema, Model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type Role = "superadmin" | "admin" | "member" | "tenant";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  societyId?: mongoose.Types.ObjectId;
  isActive: boolean;
  comparePassword(plain: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["superadmin", "admin", "member", "tenant"],
      default: "member",
    },
    societyId: { type: Schema.Types.ObjectId, ref: "Society", default: undefined },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

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