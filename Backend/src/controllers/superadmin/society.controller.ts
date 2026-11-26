import { Request, Response } from "express";
import mongoose from "mongoose";
import Society from "../../models/Society";
import User from "../../models/User";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const normalizeSlug = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const assertValidId = (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid society id");
};

// GET /api/superadmin/societies
export const getSocieties = asyncHandler(async (_req: Request, res: Response) => {
  const societies = await Society.find().sort({ createdAt: -1 });
  res.json({ success: true, societies });
});

// GET /api/superadmin/societies/:id
export const getSociety = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  assertValidId(id);
  const society = await Society.findById(id);
  if (!society) throw new ApiError(404, "Society not found");
  res.json({ success: true, society });
});

// POST /api/superadmin/societies  (society + society admin ek saath)
export const createSociety = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, address, totalHouses, phone, email, adminName, adminEmail, adminPassword } =
    req.body;

  if (!name || !adminName || !adminEmail || !adminPassword) {
    throw new ApiError(400, "Society name, admin name, admin email and admin password are required");
  }
  if (String(adminPassword).length < 6) {
    throw new ApiError(400, "Admin password must be at least 6 characters");
  }

  const finalSlug = normalizeSlug(slug || name);
  if (!finalSlug) throw new ApiError(400, "Invalid slug");

  if (await Society.findOne({ slug: finalSlug })) {
    throw new ApiError(409, "This slug is already used by another society");
  }
  if (await User.findOne({ email: String(adminEmail).toLowerCase() })) {
    throw new ApiError(409, "Admin email is already registered");
  }

  const society = await Society.create({
    name,
    slug: finalSlug,
    address,
    totalHouses: Number(totalHouses) || 0,
    contact: { phone, email },
  });

  try {
    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      societyId: society._id,
    });
  } catch (err) {
    // admin nahi bana to society bhi hata do, taki adhoora record na bache
    await Society.findByIdAndDelete(society._id);
    throw err;
  }

  res.status(201).json({ success: true, society });
});

// PUT /api/superadmin/societies/:id
export const updateSociety = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  assertValidId(id);

  const { name, slug, address, totalHouses, phone, email } = req.body;
  const update: Record<string, unknown> = {};

  if (name !== undefined) update.name = name;
  if (address !== undefined) update.address = address;
  if (totalHouses !== undefined) update.totalHouses = Number(totalHouses) || 0;
  if (phone !== undefined) update["contact.phone"] = phone;
  if (email !== undefined) update["contact.email"] = email;

  if (slug !== undefined) {
    const finalSlug = normalizeSlug(slug);
    if (!finalSlug) throw new ApiError(400, "Invalid slug");
    const clash = await Society.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (clash) throw new ApiError(409, "This slug is already used by another society");
    update.slug = finalSlug;
  }

  const society = await Society.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!society) throw new ApiError(404, "Society not found");

  res.json({ success: true, society });
});

// PATCH /api/superadmin/societies/:id/status
export const toggleSocietyStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  assertValidId(id);

  const society = await Society.findById(id);
  if (!society) throw new ApiError(404, "Society not found");

  society.status = society.status === "active" ? "inactive" : "active";
  await society.save();

  res.json({ success: true, society });
});