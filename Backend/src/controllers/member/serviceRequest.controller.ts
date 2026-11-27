import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import ServiceRequest, { ServiceRequestType } from "../../models/ServiceRequest";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { getMemberContext } from "../../utils/memberContext";
import { nextSeq } from "../../models/Counter";
import { getPrivateFilePath } from "../../config/multer";

const TYPES: ServiceRequestType[] = [
  "noc",
  "address_proof",
  "share_certificate",
  "no_dues_certificate",
  "other",
];

const buildRequestNo = async (societyId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const seq = await nextSeq(societyId, `service:${year}`);
  return `SR/${year}/${String(seq).padStart(4, "0")}`;
};

// POST /service-requests
export const createServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  const { user, houseId, societyId } = await getMemberContext(req);
  const body = req.body as Record<string, any>;

  const type = (body.type || "other") as ServiceRequestType;
  if (!TYPES.includes(type)) throw new ApiError(400, "Invalid request type");

  const purpose = String(body.purpose || "").trim();
  if (!purpose) throw new ApiError(400, "Purpose is required");

  const requestNo = await buildRequestNo(societyId);

  const request = await ServiceRequest.create({
    societyId,
    requestNo,
    houseId,
    requestedByUserId: user._id,
    requestedBy: user.name,
    type,
    purpose,
    details: body.details ? String(body.details).trim() : undefined,
    status: "pending",
    history: [{ status: "pending", note: "Request submitted", byName: user.name, at: new Date() }],
  });

  res.status(201).json({ success: true, request });
});

// GET /service-requests
export const listServiceRequests = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId, houseId };
  if (q.status) filter.status = q.status;

  const [requests, total] = await Promise.all([
    ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ServiceRequest.countDocuments(filter),
  ]);

  res.json({ success: true, requests, total, page, pages: Math.ceil(total / limit) });
});

// GET /service-requests/:id
export const getServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid request id");

  const request = await ServiceRequest.findOne({ _id: id, societyId, houseId }).lean();
  if (!request) throw new ApiError(404, "Request not found");

  res.json({ success: true, request });
});

// GET /service-requests/:id/document
export const getServiceRequestDocument = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid request id");

  const request = await ServiceRequest.findOne({ _id: id, societyId, houseId }).select(
    "status documentFile requestNo"
  );
  if (!request) throw new ApiError(404, "Request not found");
  if (request.status !== "issued" || !request.documentFile) {
    throw new ApiError(404, "Document not issued yet");
  }

  const filePath = getPrivateFilePath("documents", request.documentFile);
  if (!fs.existsSync(filePath)) throw new ApiError(404, "File not found on disk");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${request.requestNo.replace(/\//g, "-")}.pdf"`
  );
  res.sendFile(filePath);
});