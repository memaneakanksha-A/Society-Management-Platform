import { Router } from "express";
import {
  getConfig,
  updateConfig,
  generate,
  dues,
  waive,
  houseLedger,
  houseLedgerAll,
} from "../../controllers/admin/maintenance.controller";

const router = Router();

router.get("/maintenance/config", getConfig);
router.put("/maintenance/config", updateConfig);
router.post("/maintenance/generate", generate);
router.get("/maintenance/dues", dues);
router.post("/maintenance/dues/:id/waive-late-fee", waive);

router.get("/houses/:houseId/ledger", houseLedger);
router.get("/houses/:houseId/ledger/all", houseLedgerAll);

export default router;