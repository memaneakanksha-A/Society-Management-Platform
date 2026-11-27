import { Router } from "express";
import { uploadTo } from "../../config/multer";
import {
  getMeetings,
  getMeetingItem,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  toggleMeetingPublish,
  updateMeetingMinutes,
} from "../../controllers/admin/meeting.controller";

const router = Router();

router.get("/meetings", getMeetings);
router.get("/meetings/:id", getMeetingItem);
router.post("/meetings", uploadTo("meetings").single("minutesFile"), createMeeting);
router.put("/meetings/:id", uploadTo("meetings").single("minutesFile"), updateMeeting);
router.put("/meetings/:id/minutes", uploadTo("meetings").single("minutesFile"), updateMeetingMinutes);
router.patch("/meetings/:id/publish", toggleMeetingPublish);
router.delete("/meetings/:id", deleteMeeting);

export default router;