import { buildCloudComponents } from "../templateRenderer";
import type { WhatsAppProvider, WhatsAppSendInput, WhatsAppSendResult } from "./types";

export interface CloudConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
}

export const createCloudProvider = (config: CloudConfig): WhatsAppProvider => {
  const version = config.apiVersion || process.env.WHATSAPP_API_VERSION || "v21.0";

  return {
    name: "cloud",
    async send(msg: WhatsAppSendInput): Promise<WhatsAppSendResult> {
      const body: any = msg.template
        ? {
            messaging_product: "whatsapp",
            to: msg.to,
            type: "template",
            template: {
              name: msg.template.name,
              language: { code: msg.template.languageCode },
              components: buildCloudComponents(msg.template.bodyParams),
            },
          }
        : {
            messaging_product: "whatsapp",
            to: msg.to,
            type: "text",
            text: { body: msg.text || "" },
          };

      let res: Response;
      try {
        res = await fetch(
          `https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
      } catch (e: any) {
        return { ok: false, error: `Network error: ${e?.message || "unknown"}`, retryable: true };
      }

      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data?.messages?.[0]?.id) {
        return { ok: true, providerMessageId: data.messages[0].id };
      }

      const code = data?.error?.code;
      const message = data?.error?.message || `HTTP ${res.status}`;

      if (code === 190) {
        return {
          ok: false,
          error: "WhatsApp access token invalid or expired, generate a new one",
          retryable: false,
        };
      }
      if (code === 130429 || res.status >= 500) {
        return { ok: false, error: message, retryable: true };
      }
      return { ok: false, error: message, retryable: false };
    },
  };
};