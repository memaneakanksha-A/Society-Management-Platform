import path from "path";
import fs from "fs";
import { UploadFolder } from "../config/multer";

export const fileUrl = (folder: UploadFolder, filename: string): string =>
  `/uploads/${folder}/${filename}`;

export const removeFile = (url?: string): void => {
  if (!url) return;
  if (!url.startsWith("/uploads/")) return;

  const uploadsRoot = path.join(process.cwd(), "uploads");
  const target = path.join(process.cwd(), url.replace(/^\//, ""));
  const resolvedRoot = path.resolve(uploadsRoot);
  const resolvedTarget = path.resolve(target);

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    return;
  }

  fs.rm(resolvedTarget, { force: true }, () => undefined);
};