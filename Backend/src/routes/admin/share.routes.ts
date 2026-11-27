import { Router } from "express";
import { list, getHouseShare, update, bulkInit } from "../../controllers/admin/share.controller";

const router = Router();

router.get("/shares", list);
router.get("/houses/:houseId/share", getHouseShare);
router.put("/shares/:houseId", update);
router.post("/shares/bulk-init", bulkInit);

export default router;