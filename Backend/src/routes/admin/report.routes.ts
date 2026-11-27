import { Router } from "express";
import { pending, defaulters, collection, topPayers } from "../../controllers/admin/report.controller";

const router = Router();

router.get("/reports/pending", pending);
router.get("/reports/defaulters", defaulters);
router.get("/reports/collection", collection);
router.get("/reports/top-payers", topPayers);

export default router;