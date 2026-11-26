import { Router } from "express";
import { protect } from "../middleware/auth";
import { superAdminOnly } from "../middleware/role";
import {
  getSocieties,
  getSociety,
  createSociety,
  updateSociety,
  toggleSocietyStatus,
} from "../controllers/superadmin/society.controller";

const router = Router();

// is router ke saare routes sirf Super Admin ke liye
router.use(protect, superAdminOnly);

router.get("/societies", getSocieties);
router.post("/societies", createSociety);
router.get("/societies/:id", getSociety);
router.put("/societies/:id", updateSociety);
router.patch("/societies/:id/status", toggleSocietyStatus);

export default router;