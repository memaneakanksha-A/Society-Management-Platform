import { Request, Response } from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import HouseDocument, { HouseDocumentType } from "../../models/HouseDocument";
import House from "../../models/House";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const DOC_TYPES: HouseDocumentType[] = [
  "sale_deed",
  "share_certificate",
  "noc",
  "id_proof",
  "tax_bill",
  "electricity_bill",
  "other",
];

const PRIVATE_DIR = path.join(process.cwd(), "private-uploads", "house-documents");

const verifyHouse = async (houseId: string, societyId: string) => {
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const house = await House.findOne({ _id: houseId, societyId }).select("_id");
  if (!house) throw new ApiError(404, "House not found");
};

// GET /houses/:houseId/documents
export const listHouseDocuments = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = String(req.params.houseId);
  await verifyHouse(houseId, societyId);

  const documents = await HouseDocument.find({ societyId, houseId, status: "active" }).sort({
    createdAt: -1,
  });

  res.json({ success: true, documents });
});

// POST /houses/:houseId/documents (multipart, field "file")
export const createHouseDocument = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = String(req.params.houseId);
  await verifyHouse(houseId, societyId);

  const file = req.file;
  if (!file) throw new ApiError(400, "File is required");

  const body = req.body as Record<string, any>;
  const title = String(body.title || "").trim() || file.originalname;
  const docType = (body.docType || "other") as HouseDocumentType;
  if (!DOC_TYPES.includes(docType)) throw new ApiError(400, "Invalid document type");

  const document = await HouseDocument.create({
    societyId,
    houseId,
    title,
    docType,
    file: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: req.user?.id,
    notes: body.notes ? String(body.notes).trim() : undefined,
    status: "active",
  });

  res.status(201).json({ success: true, document });
});

// PUT /house-documents/:id { title, docType, notes }
export const updateHouseDocument = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid document id");

  const document = await HouseDocument.findOne({ _id: id, societyId });
  if (!document) throw new ApiError(404, "Document not found");

  const body = req.body as Record<string, any>;
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) throw new ApiError(400, "Title is required");
    document.title = title;
  }
  if (body.docType !== undefined) {
    const docType = body.docType as HouseDocumentType;
    if (!DOC_TYPES.includes(docType)) throw new ApiError(400, "Invalid document type");
    document.docType = docType;
  }
  if (body.notes !== undefined) {
    document.notes = body.notes ? String(body.notes).trim() : undefined;
  }

  await document.save();
  res.json({ success: true, document });
});

// GET /house-documents/:id/file
export const getHouseDocumentFile = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid document id");

  const document = await HouseDocument.findOne({ _id: id, societyId });
  if (!document) throw new ApiError(404, "Document not found");

  // Prevent path traversal: only use the stored basename.
  const safeName = path.basename(document.file);
  const filePath = path.join(PRIVATE_DIR, safeName);
  if (!fs.existsSync(filePath)) throw new ApiError(404, "File not found on disk");

  const downloadName = (document.originalName || safeName).replace(/["\r\n]/g, "_");
  res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(downloadName)}"`
  );
  res.sendFile(filePath);
});

// DELETE /house-documents/:id (soft delete, file kept on disk)
export const deleteHouseDocument = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid document id");

  const document = await HouseDocument.findOne({ _id: id, societyId });
  if (!document) throw new ApiError(404, "Document not found");

  document.status = "deleted";
  document.deletedAt = new Date();
  document.deletedBy = req.user?.id;
  await document.save();

  res.json({ success: true, message: "Document deleted" });
});