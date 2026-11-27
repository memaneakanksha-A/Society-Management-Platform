import { Router } from "express";
import { login, me, changePassword } from "../controllers/auth.controller";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.get("/me", protect, me);
router.post("/change-password", protect, changePassword);

export default router;