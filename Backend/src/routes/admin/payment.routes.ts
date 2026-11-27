import { Router } from "express";
import { create, list, getOne, cancel, receipt } from "../../controllers/admin/payment.controller";

const router = Router();

router.post("/payments", create);
router.get("/payments", list);
router.get("/payments/:id", getOne);
router.post("/payments/:id/cancel", cancel);
router.get("/payments/:id/receipt", receipt);

export default router;