import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getPublicSociety,
  getPublicBanners,
  getPublicMembers,
  getPublicGallery,
  getPublicAlbumImages,
  getPublicHome,
  getPublicNews,
  getPublicNewsItem,
  getPublicEvents,
  getPublicMeetings,
  getPublicNotices,
} from "../controllers/public/public.controller";

const router = Router();

router.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
  })
);

router.get("/:slug", getPublicSociety);
router.get("/:slug/banners", getPublicBanners);
router.get("/:slug/members", getPublicMembers);
router.get("/:slug/gallery", getPublicGallery);
router.get("/:slug/gallery/:albumId", getPublicAlbumImages);
router.get("/:slug/news", getPublicNews);
router.get("/:slug/news/:id", getPublicNewsItem);
router.get("/:slug/events", getPublicEvents);
router.get("/:slug/meetings", getPublicMeetings);
router.get("/:slug/notices", getPublicNotices);
router.get("/:slug/home", getPublicHome);

export default router;