import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { ApiError } from "../utils/ApiError";

export type UploadFolder =
  | "banners"
  | "members"
  | "gallery"
  | "society"
  | "news"
  | "events"
  | "notices"
  | "meetings";
export type PrivateUploadFolder = "tenants" | "expenses" | "complaints" | "documents";

const PUBLIC_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PRIVATE_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const PDF_FOLDER_ALLOWED = new Set<UploadFolder>(["notices", "meetings"]);
const MAX_SIZE = 5 * 1024 * 1024;

const wrap = (mw: (req: Request, res: any, next: (err?: any) => void) => void) => {
  return (req: Request, res: any, next: (err?: any) => void) => {
    mw(req, res, (err?: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(new ApiError(400, err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

export const uploadTo = (folder: UploadFolder) => {
  const dir = path.join(process.cwd(), "uploads", folder);
  fs.mkdirSync(dir, { recursive: true });

  const allowed = PDF_FOLDER_ALLOWED.has(folder)
    ? new Set([...PUBLIC_ALLOWED, "application/pdf"])
    : PUBLIC_ALLOWED;

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const random = Math.round(Math.random() * 1e9);
      cb(null, `${Date.now()}-${random}${ext}`);
    },
  });

  const instance = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!allowed.has(file.mimetype)) {
        return cb(
          new ApiError(
            400,
            PDF_FOLDER_ALLOWED.has(folder)
              ? "Only jpeg, png, webp, gif and pdf files are allowed"
              : "Only jpeg, png, webp and gif images are allowed"
          )
        );
      }
      cb(null, true);
    },
  });

  const origSingle = instance.single.bind(instance);
  instance.single = (name: string) => wrap(origSingle(name));

  const origArray = instance.array.bind(instance);
  instance.array = (name: string, maxCount?: number) => wrap(origArray(name, maxCount));

  return instance;
};

export const uploadToPrivate = (folder: PrivateUploadFolder) => {
  const dir = path.join(process.cwd(), "private-uploads", folder);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const random = Math.round(Math.random() * 1e9);
      cb(null, `${Date.now()}-${random}${ext}`);
    },
  });

  const instance = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!PRIVATE_ALLOWED.has(file.mimetype)) {
        return cb(new ApiError(400, "Only jpeg, png, webp and pdf files are allowed"));
      }
      cb(null, true);
    },
  });

  const origSingle = instance.single.bind(instance);
  instance.single = (name: string) => wrap(origSingle(name));

  const origArray = instance.array.bind(instance);
  instance.array = (name: string, maxCount?: number) => wrap(origArray(name, maxCount));

  return instance;
};

export const deletePrivateFile = (folder: PrivateUploadFolder, filename: string): boolean => {
  try {
    const filePath = path.join(process.cwd(), "private-uploads", folder, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const getPrivateFilePath = (folder: PrivateUploadFolder, filename: string): string => {
  // Prevent path traversal
  const safeFilename = path.basename(filename);
  return path.join(process.cwd(), "private-uploads", folder, safeFilename);
};