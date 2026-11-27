import { Router } from "express";
import {
  getIncomes,
  createIncomeHandler,
  updateIncomeHandler,
  cancelIncomeHandler,
} from "../../controllers/admin/income.controller";

const router = Router();

router.get("/incomes", getIncomes);
router.post("/incomes", createIncomeHandler);
router.put("/incomes/:id", updateIncomeHandler);
router.post("/incomes/:id/cancel", cancelIncomeHandler);

export default router;