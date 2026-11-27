import { Router } from "express";
import authRoutes from "./auth.routes";
import superAdminRoutes from "./superadmin.routes";
import adminRoutes from "./admin.routes";
import memberRoutes from "./member.routes";
import publicRoutes from "./public.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/superadmin", superAdminRoutes);
router.use("/admin", adminRoutes);
router.use("/member", memberRoutes);
router.use("/public", publicRoutes);

export default router;