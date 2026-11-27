import { Router } from "express";
import { uploadTo } from "../../config/multer";
import {
  getEvents,
  getEventItem,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventPublish,
} from "../../controllers/admin/event.controller";

const router = Router();

router.get("/events", getEvents);
router.get("/events/:id", getEventItem);
router.post("/events", uploadTo("events").single("image"), createEvent);
router.put("/events/:id", uploadTo("events").single("image"), updateEvent);
router.patch("/events/:id/publish", toggleEventPublish);
router.delete("/events/:id", deleteEvent);

export default router;