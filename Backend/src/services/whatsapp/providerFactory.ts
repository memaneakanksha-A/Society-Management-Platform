import WhatsAppSetting from "../../models/WhatsAppSetting";
import { decrypt } from "../../utils/crypto";
import { createCloudProvider } from "./providers/cloudApi.provider";
import { manualProvider } from "./providers/manual.provider";
import type { WhatsAppProvider } from "./providers/types";

export interface ResolvedProvider {
  provider: WhatsAppProvider;
  mode: "cloud" | "manual";
  testMode: boolean;
}

export const getProviderForSociety = async (societyId: string): Promise<ResolvedProvider> => {
  const setting = await WhatsAppSetting.findOne({ societyId }).select("+accessTokenEnc").lean();

  const envProvider = process.env.WHATSAPP_PROVIDER;
  let mode: "cloud" | "manual" =
    setting?.provider || (envProvider === "cloud" ? "cloud" : "manual");

  const phoneNumberId = setting?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  let accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (setting?.accessTokenEnc) {
    try {
      accessToken = decrypt(setting.accessTokenEnc);
    } catch {
      accessToken = undefined;
    }
  }

  if (mode === "cloud" && phoneNumberId && accessToken) {
    return {
      provider: createCloudProvider({ phoneNumberId, accessToken }),
      mode: "cloud",
      testMode: setting?.testMode ?? process.env.WHATSAPP_TEST_MODE === "true",
    };
  }

  mode = "manual";
  return {
    provider: manualProvider,
    mode: "manual",
    testMode: setting?.testMode ?? process.env.WHATSAPP_TEST_MODE === "true",
  };
};

export const assertTestAllowed = (testMode: boolean, phone: string): void => {
  if (!testMode) return;
  const allowed = (process.env.WHATSAPP_TEST_ALLOWED || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(phone)) {
    throw new Error(`Test mode: ${phone} is not in WHATSAPP_TEST_ALLOWED`);
  }
};