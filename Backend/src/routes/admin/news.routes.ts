import { Router } from "express";
import { uploadTo } from "../../config/multer";
import {
  getNews,
  getNewsItem,
  createNews,
  updateNews,
  deleteNews,
  toggleNewsPublish,
} from "../../controllers/admin/news.controller";

const router = Router();

router.get("/news", getNews);
router.get("/news/:id", getNewsItem);
router.post("/news", uploadTo("news").single("image"), createNews);
router.put("/news/:id", uploadTo("news").single("image"), updateNews);
router.patch("/news/:id/publish", toggleNewsPublish);
router.delete("/news/:id", deleteNews);

export default router;