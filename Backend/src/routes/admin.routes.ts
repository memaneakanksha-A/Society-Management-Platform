import { Router } from "express";
import { protect } from "../middleware/auth";
import { adminOnly } from "../middleware/role";
import { societyScope } from "../middleware/societyScope";
import { uploadTo } from "../config/multer";
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/admin/banner.controller";
import {
  getBodyMembers,
  createBodyMember,
  updateBodyMember,
  deleteBodyMember,
} from "../controllers/admin/bodyMember.controller";
import {
  getAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumImages,
  uploadAlbumImages,
  deleteGalleryImage,
} from "../controllers/admin/gallery.controller";
import {
  getSettings,
  updateSettings,
  uploadLogo,
} from "../controllers/admin/societySettings.controller";
import {
  getHouseTypes,
  createHouseType,
  updateHouseType,
  deleteHouseType,
} from "../controllers/admin/houseType.controller";
import {
  getHouses,
  getHouseStats,
  getHouse,
  createHouse,
  updateHouse,
  deleteHouse,
  bulkCreateHouses,
  importHouses,
} from "../controllers/admin/house.controller";
import {
  assignOwner,
  updateOwner,
  transferOwner,
  getOwners,
} from "../controllers/admin/owner.controller";
import multer from "multer";
import { ApiError } from "../utils/ApiError";

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname)) return cb(null, true);
    cb(new ApiError(400, "Only .xlsx, .xls and .csv files are allowed"));
  },
}).single("file");

const router = Router();

router.use(protect, adminOnly, societyScope);

router.get("/banners", getBanners);
router.post("/banners", uploadTo("banners").single("image"), createBanner);
router.put("/banners/:id", uploadTo("banners").single("image"), updateBanner);
router.delete("/banners/:id", deleteBanner);

router.get("/members", getBodyMembers);
router.post("/members", uploadTo("members").single("photo"), createBodyMember);
router.put("/members/:id", uploadTo("members").single("photo"), updateBodyMember);
router.delete("/members/:id", deleteBodyMember);

router.get("/gallery/albums", getAlbums);
router.post("/gallery/albums", uploadTo("gallery").single("cover"), createAlbum);
router.put("/gallery/albums/:id", uploadTo("gallery").single("cover"), updateAlbum);
router.delete("/gallery/albums/:id", deleteAlbum);
router.get("/gallery/albums/:id/images", getAlbumImages);
router.post("/gallery/albums/:id/images", uploadTo("gallery").array("images", 10), uploadAlbumImages);
router.delete("/gallery/images/:imageId", deleteGalleryImage);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.post("/settings/logo", uploadTo("society").single("logo"), uploadLogo);

router.get("/house-types", getHouseTypes);
router.post("/house-types", createHouseType);
router.put("/house-types/:id", updateHouseType);
router.delete("/house-types/:id", deleteHouseType);

router.get("/houses/stats", getHouseStats);
router.post("/houses/bulk", bulkCreateHouses);
router.post(
  "/houses/import",
  (req, res, next) => importUpload(req, res, next),
  importHouses
);
router.get("/houses", getHouses);
router.post("/houses", createHouse);
router.get("/houses/:id", getHouse);
router.put("/houses/:id", updateHouse);
router.delete("/houses/:id", deleteHouse);

router.post("/houses/:houseId/owner", assignOwner);
router.post("/houses/:houseId/owner/transfer", transferOwner);
router.get("/houses/:houseId/owners", getOwners);
router.put("/owners/:id", updateOwner);

export default router;