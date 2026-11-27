import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../../utils/ApiError";
import {
  listHouseDocuments,
  createHouseDocument,
  updateHouseDocument,
  getHouseDocumentFile,
  deleteHouseDocument,
} from "../../controllers/admin/houseDocument.controller";

const uploadDir = path.join(process.cwd(), "private-uploads", "house-documents");
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const random = Math.round(Math.random() * 1e9);
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new ApiError(400, "Only jpeg, png, webp and pdf files are allowed"));
    }
    cb(null, true);
  },
});

const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err?: any) => {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, err.message));
    }
    if (err) return next(err);
    next();
  });
};

const router = Router();

router.get("/houses/:houseId/documents", listHouseDocuments);
router.post("/houses/:houseId/documents", uploadSingle, createHouseDocument);
router.put("/house-documents/:id", updateHouseDocument);
router.get("/house-documents/:id/file", getHouseDocumentFile);
router.delete("/house-documents/:id", deleteHouseDocument);

export default router;