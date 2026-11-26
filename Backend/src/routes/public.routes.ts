import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getPublicSociety,
  getPublicBanners,
  getPublicMembers,
  getPublicGallery,
  getPublicAlbumImages,
  getPublicHome,
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
router.get("/:slug/home", getPublicHome);

export default router;