import crypto from "crypto";

const ALGO = "aes-256-gcm";

const getKey = (): Buffer => {
  const hex = process.env.WHATSAPP_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "WHATSAPP_ENCRYPTION_KEY is missing. Set a 32-byte hex key before saving WhatsApp credentials."
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("WHATSAPP_ENCRYPTION_KEY must be 32 bytes (64 hex characters).");
  }
  return key;
};

export const encrypt = (plain: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
};

export const decrypt = (payload: string): string => {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
};

export const maskToken = (token?: string | null): string => {
  if (!token) return "";
  return `****${token.slice(-4)}`;
};