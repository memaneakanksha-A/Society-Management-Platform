import { Router } from "express";
import {
  getCategories,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  getExpenses,
  createExpenseHandler,
  updateExpenseHandler,
  cancelExpenseHandler,
  getExpenseAttachment,
  getExpenseVoucher,
  expenseUpload,
} from "../../controllers/admin/expense.controller";

const router = Router();

router.get("/expense-categories", getCategories);
router.post("/expense-categories", createCategoryHandler);
router.put("/expense-categories/:id", updateCategoryHandler);
router.delete("/expense-categories/:id", deleteCategoryHandler);

router.get("/expenses", getExpenses);
router.post("/expenses", expenseUpload, createExpenseHandler);
router.put("/expenses/:id", expenseUpload, updateExpenseHandler);
router.post("/expenses/:id/cancel", cancelExpenseHandler);
router.get("/expenses/:id/attachment", getExpenseAttachment);
router.get("/expenses/:id/voucher", getExpenseVoucher);

export default router;