import { Router } from "express";
import { uploadTo } from "../../config/multer";
import {
  getNotices,
  getNoticeItem,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNoticePublish,
} from "../../controllers/admin/notice.controller";

const router = Router();

router.get("/notices", getNotices);
router.get("/notices/:id", getNoticeItem);
router.post("/notices", uploadTo("notices").single("attachment"), createNotice);
router.put("/notices/:id", uploadTo("notices").single("attachment"), updateNotice);
router.patch("/notices/:id/publish", toggleNoticePublish);
router.delete("/notices/:id", deleteNotice);

export default router;