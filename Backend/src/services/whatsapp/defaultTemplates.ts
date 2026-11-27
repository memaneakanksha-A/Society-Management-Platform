import WhatsAppTemplate from "../../models/WhatsAppTemplate";

interface TemplateDef {
  body: string;
  variables: string[];
}

const DEFAULTS: Record<string, { en: TemplateDef; hi: TemplateDef }> = {
  payment_thanks: {
    en: { body: "Hi {{name}}, we received your payment of {{amount}} for {{society}}. Thank you!", variables: ["name", "amount", "society"] },
    hi: { body: "नमस्ते {{name}}, {{society}} को आपका {{amount}} का भुगतान प्राप्त हो गया है। धन्यवाद!", variables: ["name", "amount", "society"] },
  },
  payment_cancelled: {
    en: { body: "Hi {{name}}, your payment of {{amount}} for {{society}} was cancelled. Reason: {{reason}}.", variables: ["name", "amount", "society", "reason"] },
    hi: { body: "नमस्ते {{name}}, {{society}} का आपका {{amount}} का भुगतान रद्द किया गया। कारण: {{reason}}।", variables: ["name", "amount", "society", "reason"] },
  },
  dues_reminder: {
    en: { body: "Hi {{name}}, a gentle reminder that maintenance of {{amount}} for {{society}} is due on {{dueDate}}.", variables: ["name", "amount", "society", "dueDate"] },
    hi: { body: "नमस्ते {{name}}, {{society}} का {{amount}} मेंटेनेंस {{dueDate}} को देय है। कृपया भुगतान करें।", variables: ["name", "amount", "society", "dueDate"] },
  },
  dues_overdue: {
    en: { body: "Hi {{name}}, maintenance of {{amount}} for {{society}} is overdue. Please pay at the earliest.", variables: ["name", "amount", "society"] },
    hi: { body: "नमस्ते {{name}}, {{society}} का {{amount}} मेंटेनेंस अतिदेय है। कृपया शीघ्र भुगतान करें।", variables: ["name", "amount", "society"] },
  },
  share_pending: {
    en: { body: "Hi {{name}}, share capital of {{amount}} for {{society}} is pending. Please complete it.", variables: ["name", "amount", "society"] },
    hi: { body: "नमस्ते {{name}}, {{society}} की {{amount}} शेयर पूंजी शेष है। कृपया पूर्ण करें।", variables: ["name", "amount", "society"] },
  },
  rent_expiry: {
    en: { body: "Hi {{name}}, your rent agreement for {{society}} expires on {{endDate}}. Please renew.", variables: ["name", "society", "endDate"] },
    hi: { body: "नमस्ते {{name}}, {{society}} का आपका किराया समझौता {{endDate}} को समाप्त होगा। कृपया नवीनीकरण करें।", variables: ["name", "society", "endDate"] },
  },
  complaint_update: {
    en: { body: "Hi {{name}}, your complaint {{complaintNo}} for {{society}} is now {{status}}.", variables: ["name", "complaintNo", "society", "status"] },
    hi: { body: "नमस्ते {{name}}, {{society}} की आपकी शिकायत {{complaintNo}} अब {{status}} है।", variables: ["name", "complaintNo", "society", "status"] },
  },
  certificate_ready: {
    en: { body: "Hi {{name}}, your {{certificateType}} for {{society}} is ready. Please collect it from the office.", variables: ["name", "certificateType", "society"] },
    hi: { body: "नमस्ते {{name}}, {{society}} का आपका {{certificateType}} तैयार है। कृपया कार्यालय से प्राप्त करें।", variables: ["name", "certificateType", "society"] },
  },
  notice_published: {
    en: { body: "Hi {{name}}, a new notice for {{society}}: {{title}}.", variables: ["name", "society", "title"] },
    hi: { body: "नमस्ते {{name}}, {{society}} के लिए नई सूचना: {{title}}।", variables: ["name", "society", "title"] },
  },
  event_published: {
    en: { body: "Hi {{name}}, {{society}} has a new event: {{title}} on {{date}}.", variables: ["name", "society", "title", "date"] },
    hi: { body: "नमस्ते {{name}}, {{society}} में नया कार्यक्रम: {{title}}, {{date}} को।", variables: ["name", "society", "title", "date"] },
  },
  meeting_notice: {
    en: { body: "Hi {{name}}, {{society}} has a meeting on {{date}} at {{time}}. Venue: {{venue}}.", variables: ["name", "society", "date", "time", "venue"] },
    hi: { body: "नमस्ते {{name}}, {{society}} की बैठक {{date}} को {{time}} पर {{venue}} में है।", variables: ["name", "society", "date", "time", "venue"] },
  },
  meeting_reminder: {
    en: { body: "Hi {{name}}, reminder: {{society}} meeting today at {{time}} in {{venue}}.", variables: ["name", "society", "time", "venue"] },
    hi: { body: "नमस्ते {{name}}, अनुस्मारक: {{society}} की बैठक आज {{time}} पर {{venue}} में है।", variables: ["name", "society", "time", "venue"] },
  },
  general_broadcast: {
    en: { body: "Hi {{name}}, {{message}} - {{society}}", variables: ["name", "message", "society"] },
    hi: { body: "नमस्ते {{name}}, {{message}} - {{society}}", variables: ["name", "message", "society"] },
  },
};

export const ensureDefaultTemplates = async (societyId: string): Promise<void> => {
  const existing = await WhatsAppTemplate.find({ societyId }).select("key language").lean();
  const have = new Set(existing.map((t: any) => `${t.key}:${t.language}`));

  const toInsert: any[] = [];
  for (const [key, langs] of Object.entries(DEFAULTS)) {
    for (const language of ["en", "hi"] as const) {
      if (have.has(`${key}:${language}`)) continue;
      const def = langs[language];
      toInsert.push({
        societyId,
        key,
        language,
        body: def.body,
        variables: def.variables,
        category: "utility",
        status: "draft",
        isActive: true,
      });
    }
  }
  if (toInsert.length) await WhatsAppTemplate.insertMany(toInsert);
};