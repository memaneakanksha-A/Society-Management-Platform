import { Router } from "express";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/role";
import { uploadToPrivate } from "../config/multer";
import {
  getMe,
  getDashboard,
  getDues,
  getPayments,
  getPaymentReceipt,
  getNotices,
  getMeetings,
  getEvents,
  getFamily,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../controllers/member/member.controller";
import {
  createComplaint,
  listComplaints,
  getComplaint,
  addComplaintComment,
  getComplaintPhoto,
} from "../controllers/member/complaint.controller";
import {
  createServiceRequest,
  listServiceRequests,
  getServiceRequest,
  getServiceRequestDocument,
} from "../controllers/member/serviceRequest.controller";

const router = Router();

router.use(protect, authorize("member", "tenant"));

router.get("/me", getMe);
router.get("/dashboard", getDashboard);
router.get("/dues", getDues);
router.get("/payments", getPayments);
router.get("/payments/:id/receipt", getPaymentReceipt);
router.get("/notices", getNotices);
router.get("/meetings", getMeetings);
router.get("/events", getEvents);

router.get("/family", getFamily);
router.post("/family", createFamilyMember);
router.put("/family/:id", updateFamilyMember);
router.delete("/family/:id", deleteFamilyMember);

router.get("/vehicles", getVehicles);
router.post("/vehicles", createVehicle);
router.put("/vehicles/:id", updateVehicle);
router.delete("/vehicles/:id", deleteVehicle);

router.post("/complaints", uploadToPrivate("complaints").array("photos", 3), createComplaint);
router.get("/complaints", listComplaints);
router.get("/complaints/:id", getComplaint);
router.post("/complaints/:id/comments", addComplaintComment);
router.get("/complaints/:id/photos/:filename", getComplaintPhoto);

router.post("/service-requests", createServiceRequest);
router.get("/service-requests", listServiceRequests);
router.get("/service-requests/:id", getServiceRequest);
router.get("/service-requests/:id/document", getServiceRequestDocument);

export default router;