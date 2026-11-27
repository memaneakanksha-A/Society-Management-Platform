export interface WhatsAppSendInput {
  to: string;
  text?: string;
  template?: {
    name: string;
    languageCode: string;
    bodyParams: string[];
  };
}

export interface WhatsAppSendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  retryable?: boolean;
}

export interface WhatsAppProvider {
  name: string;
  send(msg: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}