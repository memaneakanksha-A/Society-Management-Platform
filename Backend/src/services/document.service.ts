import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { ServiceRequestType } from "../models/ServiceRequest";

export interface DocumentData {
  societyName: string;
  societyAddress?: string;
  societyPhone?: string;
  societyEmail?: string;
  societyLogoPath?: string;
  referenceNo: string;
  date: Date;
  type: ServiceRequestType;
  houseNo: string;
  ownerName?: string;
  purpose: string;
  details?: string;
  extraLines?: string[];
  secretaryName?: string;
  chairmanName?: string;
}

const TITLES: Record<ServiceRequestType, string> = {
  noc: "NO OBJECTION CERTIFICATE",
  address_proof: "CERTIFICATE OF RESIDENCE",
  share_certificate: "SHARE CERTIFICATE",
  no_dues_certificate: "NO DUES CERTIFICATE",
  other: "SERVICE CERTIFICATE",
};

const dateStr = (d: Date): string =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const inr = (n: number): string =>
  `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n)}`;

export const money = inr;

const resolveLogo = (logoPath?: string): string | undefined => {
  if (!logoPath) return undefined;
  try {
    const clean = path.basename(logoPath);
    const candidate = path.join(process.cwd(), "uploads", "society", clean);
    return fs.existsSync(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
};

export const buildDocumentBuffer = (data: DocumentData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: data.referenceNo } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const left = 50;
    const right = pageWidth - 50;
    const contentWidth = right - left;

    doc.save();
    doc.rect(24, 24, pageWidth - 48, doc.page.height - 48).lineWidth(1).strokeColor("#cbd5e1").stroke();
    doc.restore();

    const bandTop = 50;
    const bandHeight = 90;
    doc.save();
    doc.rect(left, bandTop, contentWidth, bandHeight).fill("#4f46e5");
    doc.restore();

    let headerTextLeft = left + 16;
    const logo = resolveLogo(data.societyLogoPath);
    if (logo) {
      try {
        doc.image(logo, left + 16, bandTop + 18, { fit: [54, 54] });
        headerTextLeft = left + 82;
      } catch {
        // ignore
      }
    }

    doc.fillColor("#ffffff").fontSize(16).text(data.societyName, headerTextLeft, bandTop + 16, {
      width: right - headerTextLeft - 16,
      ellipsis: true,
    });
    doc.fontSize(9).fillColor("#e0e7ff");
    let hy = bandTop + 40;
    if (data.societyAddress) {
      doc.text(data.societyAddress, headerTextLeft, hy, { width: right - headerTextLeft - 16 });
      hy += 12;
    }
    const contactLine = [data.societyPhone, data.societyEmail].filter(Boolean).join("  |  ");
    if (contactLine) doc.text(contactLine, headerTextLeft, hy, { width: right - headerTextLeft - 16 });

    let y = bandTop + bandHeight + 24;

    doc.fontSize(15).fillColor("#1e293b").text(TITLES[data.type], left, y, {
      align: "center",
      width: contentWidth,
    });
    y += 30;

    doc.fontSize(10).fillColor("#334155");
    doc.text(`Ref No: ${data.referenceNo}`, left, y);
    doc.text(`Date: ${dateStr(data.date)}`, left + contentWidth / 2, y);
    y += 30;

    const line = (text: string, opts?: { bold?: boolean; indent?: number }) => {
      doc
        .fontSize(11)
        .fillColor("#0f172a")
        .text(text, left + (opts?.indent || 0), y, {
          width: contentWidth - (opts?.indent || 0),
          lineGap: 2,
        });
      y += doc.heightOfString(text, { width: contentWidth - (opts?.indent || 0) }) + 8;
    };

    if (data.type === "no_dues_certificate" || data.type === "share_certificate") {
      line(
        `This is to certify that ${data.ownerName || "the owner"} of House No. ${data.houseNo} has the following record with the society.`
      );
    } else {
      line(
        `This is to certify that ${data.ownerName || "the resident"} is associated with House No. ${data.houseNo} of this society.`
      );
    }

    if (data.purpose) line(`Purpose: ${data.purpose}`);
    if (data.details) line(`Details: ${data.details}`);

    (data.extraLines || []).forEach((l) => line(l));

    y += 16;
    line("This certificate is issued at the request of the resident for the purpose stated above.");
    y += 24;

    const signY = Math.min(y + 30, doc.page.height - 160);
    const colWidth = contentWidth / 2 - 20;
    doc.fontSize(10).fillColor("#0f172a");
    doc.text("_______________________", left, signY);
    doc.text("_______________________", left + contentWidth / 2, signY);
    doc.text(data.secretaryName || "Secretary", left, signY + 14, { width: colWidth });
    doc.text(data.chairmanName || "Chairman", left + contentWidth / 2, signY + 14, {
      width: colWidth,
    });

    doc.end();
  });

export const saveDocumentFile = (referenceNo: string, buffer: Buffer): string => {
  const dir = path.join(process.cwd(), "private-uploads", "documents");
  fs.mkdirSync(dir, { recursive: true });
  const safeRef = referenceNo.replace(/[^a-zA-Z0-9]/g, "-");
  const filename = `${safeRef}-${Date.now()}.pdf`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return filename;
};