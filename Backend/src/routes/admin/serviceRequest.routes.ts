import { Router } from "express";
import {
  listServiceRequests,
  getServiceRequest,
  updateServiceRequest,
  issueServiceRequest,
  getServiceRequestDocument,
} from "../../controllers/admin/serviceRequest.controller";

const router = Router();

router.get("/service-requests", listServiceRequests);
router.get("/service-requests/:id", getServiceRequest);
router.patch("/service-requests/:id", updateServiceRequest);
router.post("/service-requests/:id/issue", issueServiceRequest);
router.get("/service-requests/:id/document", getServiceRequestDocument);

export default router;