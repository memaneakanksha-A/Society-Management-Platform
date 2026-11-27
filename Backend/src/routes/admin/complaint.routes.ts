import { Router } from "express";
import { uploadToPrivate } from "../../config/multer";
import {
  listComplaints,
  getComplaint,
  updateComplaint,
  addComplaintComment,
  createComplaint,
  getComplaintPhoto,
} from "../../controllers/admin/complaint.controller";

const router = Router();

router.get("/complaints", listComplaints);
router.post("/complaints", uploadToPrivate("complaints").array("photos", 3), createComplaint);
router.get("/complaints/:id", getComplaint);
router.patch("/complaints/:id", updateComplaint);
router.post("/complaints/:id/comments", addComplaintComment);
router.get("/complaints/:id/photos/:filename", getComplaintPhoto);

export default router;