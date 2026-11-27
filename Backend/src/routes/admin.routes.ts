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
  bulkDeleteHouses,
  bulkChangeHouseType,
  importHouses,
} from "../controllers/admin/house.controller";
import {
  assignOwner,
  updateOwner,
  transferOwner,
  getOwners,
} from "../controllers/admin/owner.controller";
import {
  getTenants,
  getTenantStats,
  createTenant,
  getTenant,
  updateTenant,
  renewTenant,
  vacateTenant,
  getHouseTenants,
  getTenantDocument,
  tenantCreateUpload,
  tenantUpdateUpload,
} from "../controllers/admin/tenant.controller";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getHouseVehicles,
} from "../controllers/admin/vehicle.controller";
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from "../controllers/admin/family.controller";
import {
  listMemberLogins,
  createMemberLogin,
  bulkCreateMemberLogins,
  resetMemberPassword,
  setMemberLoginStatus,
} from "../controllers/admin/memberLogin.controller";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import maintenanceRoutes from "./admin/maintenance.routes";
import paymentRoutes from "./admin/payment.routes";
import shareRoutes from "./admin/share.routes";
import reportRoutes from "./admin/report.routes";
import expenseRoutes from "./admin/expense.routes";
import incomeRoutes from "./admin/income.routes";
import financeRoutes from "./admin/finance.routes";
import newsRoutes from "./admin/news.routes";
import eventRoutes from "./admin/event.routes";
import meetingRoutes from "./admin/meeting.routes";
import noticeRoutes from "./admin/notice.routes";
import complaintRoutes from "./admin/complaint.routes";
import serviceRequestRoutes from "./admin/serviceRequest.routes";
import houseDocumentRoutes from "./admin/houseDocument.routes";
import whatsappRoutes from "./admin/whatsapp.routes";

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

router.use(maintenanceRoutes);
router.use(paymentRoutes);
router.use(shareRoutes);
router.use(reportRoutes);
router.use(expenseRoutes);
router.use(incomeRoutes);
router.use(financeRoutes);
router.use(newsRoutes);
router.use(eventRoutes);
router.use(meetingRoutes);
router.use(noticeRoutes);
router.use(complaintRoutes);
router.use(serviceRequestRoutes);
router.use(houseDocumentRoutes);
router.use(whatsappRoutes);

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
router.post("/houses/bulk-delete", bulkDeleteHouses);
router.post("/houses/bulk-change-type", bulkChangeHouseType);
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

// Tenant routes
router.get("/tenants/stats", getTenantStats);
router.get("/tenants", getTenants);
router.post("/houses/:houseId/tenants", tenantCreateUpload, createTenant);
router.get("/houses/:houseId/tenants", getHouseTenants);
router.get("/tenants/:id", getTenant);
router.put("/tenants/:id", tenantUpdateUpload, updateTenant);
router.put("/tenants/:id/renew", tenantUpdateUpload, renewTenant);
router.put("/tenants/:id/vacate", vacateTenant);
router.get("/tenants/:id/documents/:type", getTenantDocument);

// Vehicle routes
router.get("/vehicles", getVehicles);
router.post("/vehicles", createVehicle);
router.put("/vehicles/:id", updateVehicle);
router.delete("/vehicles/:id", deleteVehicle);
router.get("/houses/:houseId/vehicles", getHouseVehicles);

// Family member routes
router.get("/houses/:houseId/family", getFamilyMembers);
router.post("/houses/:houseId/family", createFamilyMember);
router.put("/family/:id", updateFamilyMember);
router.delete("/family/:id", deleteFamilyMember);

// Member login routes
router.get("/member-logins", listMemberLogins);
router.post("/member-logins/bulk-create", bulkCreateMemberLogins);
router.post("/member-logins/:userId/reset-password", resetMemberPassword);
router.patch("/member-logins/:userId/status", setMemberLoginStatus);
router.post("/houses/:houseId/member-login", createMemberLogin);

export default router;