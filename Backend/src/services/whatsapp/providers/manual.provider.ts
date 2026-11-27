import type { WhatsAppProvider, WhatsAppSendInput, WhatsAppSendResult } from "./types";

export const buildWaMeLink = (phone: string, text?: string): string => {
  const base = `https://wa.me/${phone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

export const manualProvider: WhatsAppProvider = {
  name: "manual",
  async send(_msg: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    return { ok: false, error: "Manual mode: open wa.me link", retryable: false };
  },
};