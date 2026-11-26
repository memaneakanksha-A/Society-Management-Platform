import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User";

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not defined");
  await mongoose.connect(uri);

  const email = (process.env.SUPERADMIN_EMAIL || "").toLowerCase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
  } else {
    await User.create({
      name: process.env.SUPERADMIN_NAME || "Super Admin",
      email,
      password: process.env.SUPERADMIN_PASSWORD,
      role: "superadmin",
    });
    console.log(`Super admin created: ${email}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});