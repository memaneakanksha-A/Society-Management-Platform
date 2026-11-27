import { Router } from "express";
import {
  getOpeningBalanceHandler,
  updateOpeningBalanceHandler,
  incomeExpenseReportHandler,
  expensesSummaryHandler,
} from "../../controllers/admin/finance.controller";

const router = Router();

router.get("/finance/opening-balance", getOpeningBalanceHandler);
router.put("/finance/opening-balance", updateOpeningBalanceHandler);

router.get("/reports/income-expense", incomeExpenseReportHandler);
router.get("/reports/expenses-summary", expensesSummaryHandler);

export default router;