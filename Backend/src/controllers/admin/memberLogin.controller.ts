import { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import House from "../../models/House";
import Owner from "../../models/Owner";
import Tenant from "../../models/Tenant";
import User from "../../models/User";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

type LoginFor = "owner" | "tenant";

const TEMP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const generateTempPassword = (length = 8): string => {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += TEMP_CHARS[bytes[i] % TEMP_CHARS.length];
  }
  return out;
};

const roleFor = (forWho: LoginFor): "member" | "tenant" =>
  forWho === "owner" ? "member" : "tenant";

const normalizePhone = (v?: string): string | undefined => {
  if (!v) return undefined;
  const trimmed = String(v).trim();
  return trimmed || undefined;
};

const normalizeEmail = (v?: string): string | undefined => {
  if (!v) return undefined;
  const trimmed = String(v).trim().toLowerCase();
  return trimmed || undefined;
};

// GET /member-logins?search=&role=&page=
export const listMemberLogins = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);
  const roleFilter = q.role === "owner" || q.role === "tenant" ? q.role : undefined;
  const search = q.search?.trim().toLowerCase();

  const [houses, owners, tenants, users] = await Promise.all([
    House.find({ societyId }).select("houseNo currentOwnerId currentTenantId").sort({ houseNo: 1 }).lean(),
    Owner.find({ societyId, isCurrent: true }).select("houseId name email phone").lean(),
    Tenant.find({ societyId, status: "active" }).select("houseId name email phone").lean(),
    User.find({ societyId, role: { $in: ["member", "tenant"] } })
      .select("houseId role name email phone isActive mustChangePassword")
      .lean(),
  ]);

  const ownerByHouse = new Map<string, any>();
  owners.forEach((o) => ownerByHouse.set(String(o.houseId), o));
  const tenantByHouse = new Map<string, any>();
  tenants.forEach((t) => tenantByHouse.set(String(t.houseId), t));

  const userByHouseRole = new Map<string, any>();
  users.forEach((u) => userByHouseRole.set(`${u.houseId}:${u.role}`, u));

  const entries: any[] = [];
  for (const house of houses) {
    const houseId = String(house._id);
    const owner = ownerByHouse.get(houseId);
    const tenant = tenantByHouse.get(houseId);

    const push = (forWho: LoginFor, person: any) => {
      if (!person) return;
      const role = roleFor(forWho);
      const login = userByHouseRole.get(`${houseId}:${role}`);
      entries.push({
        houseId,
        houseNo: house.houseNo,
        role: forWho,
        name: person.name,
        email: person.email || login?.email || null,
        phone: person.phone || login?.phone || null,
        userId: login ? String(login._id) : null,
        isActive: login ? login.isActive : null,
        mustChangePassword: login ? login.mustChangePassword : null,
      });
    };

    if (roleFilter !== "tenant") push("owner", owner);
    if (roleFilter !== "owner") push("tenant", tenant);
  }

  const filtered = search
    ? entries.filter((e) =>
        [e.houseNo, e.name, e.email, e.phone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(search))
      )
    : entries;

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  res.json({
    success: true,
    logins: filtered.slice(start, start + limit),
    total,
    page,
    pages,
  });
});

// POST /houses/:houseId/member-login { for: "owner"|"tenant" }
export const createMemberLogin = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = String(req.params.houseId);
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");

  const forWho = (req.body as any).for as LoginFor;
  if (forWho !== "owner" && forWho !== "tenant") {
    throw new ApiError(400, "`for` must be 'owner' or 'tenant'");
  }

  const house = await House.findOne({ _id: houseId, societyId });
  if (!house) throw new ApiError(404, "House not found");

  const person: any =
    forWho === "owner"
      ? await Owner.findOne({ houseId, societyId, isCurrent: true }).lean()
      : await Tenant.findOne({ houseId, societyId, status: "active" }).lean();

  if (!person) {
    throw new ApiError(400, `This house has no ${forWho} to create a login for`);
  }

  const email = normalizeEmail((person as any).email);
  const phone = normalizePhone((person as any).phone);
  if (!email && !phone) {
    throw new ApiError(400, "Owner/tenant must have an email or phone to create a login");
  }

  const role = roleFor(forWho);
  const existing = await User.findOne({ houseId, societyId, role });
  if (existing) throw new ApiError(409, "A login already exists for this house and role");

  if (email) {
    const dupEmail = await User.findOne({ email });
    if (dupEmail) throw new ApiError(409, "Email already used by another account");
  }
  if (phone) {
    const dupPhone = await User.findOne({ phone });
    if (dupPhone) throw new ApiError(409, "Phone already used by another account");
  }

  const tempPassword = generateTempPassword();
  const user = await User.create({
    name: person.name,
    email,
    phone,
    password: tempPassword,
    role,
    societyId,
    houseId,
    linkedOwnerId: forWho === "owner" ? (person as any)._id : (house.currentOwnerId as any),
    linkedTenantId: forWho === "tenant" ? (person as any)._id : (house.currentTenantId as any),
    isActive: true,
    mustChangePassword: true,
  });

  res.status(201).json({
    success: true,
    tempPassword,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      houseId,
    },
  });
});

// POST /member-logins/bulk-create { for: "owner" }
export const bulkCreateMemberLogins = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const forWho = (req.body as any).for as LoginFor;
  if (forWho !== "owner") {
    throw new ApiError(400, "Only 'owner' bulk creation is supported");
  }

  const owners = await Owner.find({ societyId, isCurrent: true }).lean();
  const houses = await House.find({ societyId }).select("houseNo").lean();
  const houseNoById = new Map<string, string>();
  houses.forEach((h) => houseNoById.set(String(h._id), h.houseNo));

  const existing = await User.find({ societyId, role: "member" }).select("houseId email phone").lean();
  const existingHouses = new Set(existing.map((u) => String(u.houseId)));
  const usedEmails = new Set(existing.map((u) => u.email).filter(Boolean) as string[]);
  const usedPhones = new Set(existing.map((u) => u.phone).filter(Boolean) as string[]);

  const created: { houseNo: string; name: string; identifier: string; tempPassword: string }[] = [];
  let skipped = 0;

  for (const owner of owners) {
    const houseId = String(owner.houseId);
    if (existingHouses.has(houseId)) {
      skipped += 1;
      continue;
    }
    const email = normalizeEmail(owner.email);
    const phone = normalizePhone(owner.phone);
    const identifier = email || phone;
    if (!identifier) {
      skipped += 1;
      continue;
    }
    if (email && usedEmails.has(email)) {
      skipped += 1;
      continue;
    }
    if (phone && usedPhones.has(phone)) {
      skipped += 1;
      continue;
    }

    const tempPassword = generateTempPassword();
    await User.create({
      name: owner.name,
      email,
      phone,
      password: tempPassword,
      role: "member",
      societyId,
      houseId: owner.houseId,
      linkedOwnerId: (owner as any)._id,
      isActive: true,
      mustChangePassword: true,
    });

    existingHouses.add(houseId);
    if (email) usedEmails.add(email);
    if (phone) usedPhones.add(phone);

    created.push({
      houseNo: houseNoById.get(houseId) || "-",
      name: owner.name,
      identifier,
      tempPassword,
    });
  }

  res.json({ success: true, created, skipped });
});

// POST /member-logins/:userId/reset-password
export const resetMemberPassword = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user id");

  const user = await User.findOne({ _id: userId, societyId, role: { $in: ["member", "tenant"] } });
  if (!user) throw new ApiError(404, "Member login not found");

  const tempPassword = generateTempPassword();
  user.password = tempPassword;
  user.mustChangePassword = true;
  await user.save();

  res.json({ success: true, tempPassword });
});

// PATCH /member-logins/:userId/status { isActive }
export const setMemberLoginStatus = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user id");

  const body = req.body as { isActive?: boolean | string };
  if (body.isActive === undefined) throw new ApiError(400, "isActive is required");
  const isActive = body.isActive === true || body.isActive === "true";

  const user = await User.findOne({ _id: userId, societyId, role: { $in: ["member", "tenant"] } });
  if (!user) throw new ApiError(404, "Member login not found");

  user.isActive = isActive;
  await user.save();

  res.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      isActive: user.isActive,
    },
  });
});