import { Request, Response } from "express";
import mongoose from "mongoose";
import WhatsAppSetting from "../../models/WhatsAppSetting";
import WhatsAppTemplate from "../../models/WhatsAppTemplate";
import MessageLog from "../../models/MessageLog";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { encrypt, decrypt, maskToken } from "../../utils/crypto";
import { normalizePhone } from "../../utils/phone";
import { render } from "../../services/whatsapp/templateRenderer";
import { ensureDefaultTemplates } from "../../services/whatsapp/defaultTemplates";
import { getProviderForSociety, assertTestAllowed } from "../../services/whatsapp/providerFactory";
import { buildWaMeLink } from "../../services/whatsapp/providers/manual.provider";

const rateMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

const tokenHintFor = (enc?: string): string => {
  if (!enc) return "";
  try {
    return maskToken(decrypt(enc));
  } catch {
    return "****";
  }
};

const enforceRateLimit = (societyId: string) => {
  const now = Date.now();
  const hits = (rateMap.get(societyId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    throw new ApiError(429, "Too many test messages. Try again in a minute.");
  }
  hits.push(now);
  rateMap.set(societyId, hits);
};

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const setting = await WhatsAppSetting.findOne({ societyId }).select("+accessTokenEnc").lean();
  if (!setting) {
    res.json({
      success: true,
      settings: {
        provider: "manual",
        enabled: false,
        sendTo: "both",
        language: "en",
        quietHours: { enabled: true, start: "21:00", end: "08:00" },
        dailyLimit: 500,
        testMode: true,
        hasToken: false,
        tokenHint: "",
      },
    });
    return;
  }
  const s = setting as any;
  res.json({
    success: true,
    settings: {
      provider: s.provider,
      phoneNumberId: s.phoneNumberId || "",
      businessAccountId: s.businessAccountId || "",
      enabled: s.enabled,
      sendTo: s.sendTo,
      language: s.language,
      quietHours: s.quietHours,
      dailyLimit: s.dailyLimit,
      testMode: s.testMode,
      hasToken: !!s.accessTokenEnc,
      tokenHint: tokenHintFor(s.accessTokenEnc),
    },
  });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;

  const update: Record<string, any> = {};
  if (body.provider !== undefined) update.provider = body.provider;
  if (body.phoneNumberId !== undefined) update.phoneNumberId = body.phoneNumberId;
  if (body.businessAccountId !== undefined) update.businessAccountId = body.businessAccountId;
  if (body.enabled !== undefined) update.enabled = !!body.enabled;
  if (body.sendTo !== undefined) update.sendTo = body.sendTo;
  if (body.language !== undefined) update.language = body.language;
  if (body.dailyLimit !== undefined) update.dailyLimit = Number(body.dailyLimit) || 0;
  if (body.testMode !== undefined) update.testMode = !!body.testMode;
  if (body.quietHours !== undefined) update.quietHours = body.quietHours;

  if (typeof body.accessToken === "string" && body.accessToken.trim()) {
    update.accessTokenEnc = encrypt(body.accessToken.trim());
  }

  const setting = await WhatsAppSetting.findOneAndUpdate(
    { societyId },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select("+accessTokenEnc");

  const s: any = setting;
  res.json({
    success: true,
    settings: {
      provider: s.provider,
      phoneNumberId: s.phoneNumberId || "",
      businessAccountId: s.businessAccountId || "",
      enabled: s.enabled,
      sendTo: s.sendTo,
      language: s.language,
      quietHours: s.quietHours,
      dailyLimit: s.dailyLimit,
      testMode: s.testMode,
      hasToken: !!s.accessTokenEnc,
      tokenHint: tokenHintFor(s.accessTokenEnc),
    },
  });
});

export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  await ensureDefaultTemplates(societyId);
  const templates = await WhatsAppTemplate.find({ societyId }).sort({ key: 1, language: 1 }).lean();
  res.json({ success: true, templates });
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid template id");

  const tpl = await WhatsAppTemplate.findOne({ _id: id, societyId });
  if (!tpl) throw new ApiError(404, "Template not found");

  const body = req.body as Record<string, any>;
  if (body.body !== undefined) tpl.body = String(body.body);
  if (body.isActive !== undefined) tpl.isActive = !!body.isActive;
  if (body.providerTemplateName !== undefined) tpl.providerTemplateName = body.providerTemplateName;
  if (body.providerLanguageCode !== undefined) tpl.providerLanguageCode = body.providerLanguageCode;
  if (body.status !== undefined) tpl.status = body.status;

  await tpl.save();
  res.json({ success: true, template: tpl });
});

export const testSend = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;
  const phone = normalizePhone(String(body.phone || ""));
  if (!phone) throw new ApiError(400, "Invalid phone number");

  enforceRateLimit(societyId);

  const { provider, mode, testMode } = await getProviderForSociety(societyId);
  try {
    assertTestAllowed(testMode, phone);
  } catch (e: any) {
    throw new ApiError(400, e.message);
  }

  const text: string | undefined = body.text ? String(body.text) : undefined;
  const result = await provider.send(
    mode === "cloud" && !text
      ? { to: phone, template: { name: "hello_world", languageCode: "en_US", bodyParams: [] } }
      : { to: phone, text: text || "Test message from society" }
  );

  await MessageLog.create({
    societyId,
    recipientType: "owner",
    phone,
    templateKey: mode === "cloud" && !text ? "hello_world" : undefined,
    language: "en",
    renderedText: text,
    status: result.ok ? "sent" : "failed",
    providerMessageId: result.providerMessageId,
    error: result.error,
    attempts: 1,
    sentAt: result.ok ? new Date() : undefined,
    createdBy: (req as any).user?.name || "Admin",
  });

  res.json({
    success: true,
    ok: result.ok,
    error: result.error,
    providerMessageId: result.providerMessageId,
    mode,
    waLink: mode === "manual" ? buildWaMeLink(phone, text) : undefined,
  });
});

export const previewTemplate = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;
  const key = String(body.key || "");
  const language = body.language === "hi" ? "hi" : "en";
  const vars = (body.variables || {}) as Record<string, unknown>;

  const filter: Record<string, any> = { societyId, key, language };
  const tpl = await WhatsAppTemplate.findOne(filter).lean();
  if (!tpl) throw new ApiError(404, "Template not found");

  const result = render(tpl.body, vars);
  res.json({ success: true, text: result.text, missing: result.missing });
});
