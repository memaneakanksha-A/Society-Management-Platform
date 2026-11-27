import { Router } from "express";
import {
  getSettings,
  updateSettings,
  listTemplates,
  updateTemplate,
  testSend,
  previewTemplate,
} from "../../controllers/admin/whatsapp.controller";

const router = Router();

router.get("/whatsapp/settings", getSettings);
router.put("/whatsapp/settings", updateSettings);
router.get("/whatsapp/templates", listTemplates);
router.put("/whatsapp/templates/:id", updateTemplate);
router.post("/whatsapp/test-send", testSend);
router.post("/whatsapp/preview-template", previewTemplate);

export default router;