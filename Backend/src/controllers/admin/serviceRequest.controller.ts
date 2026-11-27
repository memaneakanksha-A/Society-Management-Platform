import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import ServiceRequest, { ServiceRequestStatus } from "../../models/ServiceRequest";
import House from "../../models/House";
import Owner from "../../models/Owner";
import Society from "../../models/Society";
import BodyMember from "../../models/BodyMember";
import ShareRecord from "../../models/ShareRecord";
import MaintenanceDue from "../../models/MaintenanceDue";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { getPrivateFilePath } from "../../config/multer";
import { buildDocumentBuffer, saveDocumentFile, money, DocumentData } from "../../services/document.service";

const STATUSES: ServiceRequestStatus[] = ["pending", "approved", "rejected", "issued"];

const adminName = (req: Request): string => (req as any).user?.name || "Admin";

// GET /service-requests?status=&type=&search=&page=
export const listServiceRequests = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId };
  if (q.status) filter.status = q.status;
  if (q.type) filter.type = q.type;
  if (q.search) {
    const regex = new RegExp(q.search, "i");
    const houses = await House.find({ societyId, houseNo: regex }).select("_id");
    filter.$or = [{ requestNo: regex }, { purpose: regex }, { requestedBy: regex }];
    if (houses.length) filter.$or.push({ houseId: { $in: houses.map((h) => h._id) } });
  }

  const [requests, total, all] = await Promise.all([
    ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("houseId", "houseNo")
      .lean(),
    ServiceRequest.countDocuments(filter),
    ServiceRequest.find({ societyId }).select("status").lean(),
  ]);

  const stats = { total: all.length } as Record<string, number>;
  STATUSES.forEach((s) => {
    stats[s] = (all as any[]).filter((r) => r.status === s).length;
  });

  res.json({ success: true, requests, total, page, pages: Math.ceil(total / limit), stats });
});

// GET /service-requests/:id
export const getServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid request id");

  const request = await ServiceRequest.findOne({ _id: id, societyId })
    .populate("houseId", "houseNo")
    .lean();
  if (!request) throw new ApiError(404, "Request not found");

  res.json({ success: true, request });
});

// PATCH /service-requests/:id { status, adminRemarks }
export const updateServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid request id");

  const request = await ServiceRequest.findOne({ _id: id, societyId });
  if (!request) throw new ApiError(404, "Request not found");

  const body = req.body as Record<string, any>;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw new ApiError(400, "Invalid status");
    if (body.status === "issued") {
      throw new ApiError(400, "Use the issue endpoint to generate the document");
    }
    request.status = body.status;
  }
  if (body.adminRemarks !== undefined) {
    request.adminRemarks = body.adminRemarks ? String(body.adminRemarks).trim() : undefined;
  }

  request.history.push({
    status: request.status,
    note: request.adminRemarks || "Request updated",
    byName: adminName(req),
    at: new Date(),
  });

  await request.save();
  res.json({ success: true, request });
});

// POST /service-requests/:id/issue
export const issueServiceRequest = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid request id");

  const request = await ServiceRequest.findOne({ _id: id, societyId });
  if (!request) throw new ApiError(404, "Request not found");
  if (request.status === "rejected") throw new ApiError(400, "Rejected request cannot be issued");

  const [house, owner, society, bodyMembers] = await Promise.all([
    House.findOne({ _id: request.houseId, societyId }).lean(),
    Owner.findOne({ societyId, houseId: request.houseId, isCurrent: true }).select("name").lean(),
    Society.findById(societyId).lean(),
    BodyMember.find({ societyId, isActive: true }).select("name designation").lean(),
  ]);
  if (!house) throw new ApiError(404, "House not found");

  const extraLines: string[] = [];

  if (request.type === "no_dues_certificate") {
    const dues = await MaintenanceDue.find({
      societyId,
      houseId: request.houseId,
      status: { $ne: "cancelled" },
    })
      .select("amount paidPrincipal")
      .lean();
    const outstanding = (dues as any[]).reduce(
      (s, d) => s + Math.max(0, d.amount - d.paidPrincipal),
      0
    );
    if (outstanding > 0) {
      throw new ApiError(400, `Outstanding maintenance dues of ${money(outstanding)} pending`);
    }
    extraLines.push("Maintenance dues outstanding: Nil");
  }

  if (request.type === "share_certificate") {
    const share = await ShareRecord.findOne({ societyId, houseId: request.houseId }).lean();
    if (share) {
      extraLines.push(`Share Certificate No: ${share.certificateNo || "-"}`);
      extraLines.push(`Total Share Amount: ${money(share.totalAmount)}`);
      extraLines.push(`Paid Amount: ${money(share.paidAmount)}`);
      extraLines.push(`Share Status: ${share.status}`);
    } else {
      extraLines.push("No share record found for this house.");
    }
  }

  const secretary = (bodyMembers as any[]).find((m) => /secretary/i.test(m.designation));
  const chairman = (bodyMembers as any[]).find((m) =>
    /chairman|president/i.test(m.designation)
  );

  const data: DocumentData = {
    societyName: society?.name || "Society",
    societyAddress: society?.address,
    societyPhone: society?.contact?.phone,
    societyEmail: society?.contact?.email,
    societyLogoPath: society?.logo,
    referenceNo: request.requestNo,
    date: new Date(),
    type: request.type,
    houseNo: (house as any).houseNo || "-",
    ownerName: (owner as any)?.name,
    purpose: request.purpose,
    details: request.details,
    extraLines,
    secretaryName: secretary?.name,
    chairmanName: chairman?.name,
  };

  const buffer = await buildDocumentBuffer(data);
  const filename = saveDocumentFile(request.requestNo, buffer);

  request.status = "issued";
  request.issuedAt = new Date();
  request.documentFile = filename;
  request.history.push({
    status: "issued",
    note: request.adminRemarks || "Document issued",
    byName: adminName(req),
    at: new Date(),
  });

  await request.save();
  res.json({ success: true, request });
});

// GET /service-requests/:id/document
export const getServiceRequestDocument = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid request id");

  const request = await ServiceRequest.findOne({ _id: id, societyId }).select(
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