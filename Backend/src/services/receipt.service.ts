import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { numberToWords } from "../utils/numberToWords";

export interface ReceiptData {
  societyName: string;
  societyAddress?: string;
  societyPhone?: string;
  societyEmail?: string;
  societyLogoPath?: string; // absolute filesystem path if resolvable
  receiptNo: string;
  paidOn: Date;
  financialYear: string;
  cancelled: boolean;
  payerName?: string;
  paidBy: "owner" | "tenant";
  houseNo: string;
  houseType?: string;
  ownerName?: string;
  area?: number;
  location?: string;
  paymentFor: string;
  mode: string;
  transactionId?: string;
  chequeNo?: string;
  chequeDate?: Date;
  bankName?: string;
  amount: number;
  principal: number;
  lateFee: number;
  advance: number;
  balanceDue: number;
  receivedBy: string;
}

const inr = (n: number): string =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n)}`;

const dateStr = (d: Date): string =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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

export const buildReceiptBuffer = (data: ReceiptData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Receipt ${data.receiptNo}` } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const left = 40;
    const right = pageWidth - 40;
    const contentWidth = right - left;

    // Outer border
    doc.save();
    doc.rect(20, 20, pageWidth - 40, doc.page.height - 40).lineWidth(1).strokeColor("#cbd5e1").stroke();
    doc.restore();

    // Header band
    const bandTop = 40;
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
        // ignore image errors
      }
    }

    doc.fillColor("#ffffff").text(data.societyName, headerTextLeft, bandTop + 16, {
      width: right - headerTextLeft - 16,
      align: "left",
      ellipsis: true,
    });
    doc.fontSize(9).fillColor("#e0e7ff");
    let y = bandTop + 38;
    if (data.societyAddress) {
      doc.text(data.societyAddress, headerTextLeft, y, { width: right - headerTextLeft - 16 });
      y += 12;
    }
    const contactLine = [data.societyPhone, data.societyEmail].filter(Boolean).join("  |  ");
    if (contactLine) doc.text(contactLine, headerTextLeft, y, { width: right - headerTextLeft - 16 });

    // Title
    doc.fontSize(16).fillColor("#1e293b");
    doc.text("PAYMENT RECEIPT", left, bandTop + bandHeight + 18, { align: "center" });
    doc.fontSize(9).fillColor("#64748b");
    doc.text(`Financial Year ${data.financialYear}`, left, bandTop + bandHeight + 40, { align: "center" });

    let cursorY = bandTop + bandHeight + 62;

    // Meta row
    doc.fontSize(10).fillColor("#334155");
    doc.text(`Receipt No: ${data.receiptNo}`, left, cursorY);
    doc.text(`Date: ${dateStr(data.paidOn)}`, left + contentWidth / 2, cursorY);
    cursorY += 22;

    const labelValue = (label: string, value: string, x: number, y: number, width: number) => {
      doc.fontSize(8).fillColor("#94a3b8").text(label.toUpperCase(), x, y, { width });
      doc.fontSize(10).fillColor("#0f172a").text(value || "-", x, y + 11, { width, ellipsis: true });
    };

    // Received from / house details
    labelValue("Received From", data.payerName || data.paidBy, left, cursorY, contentWidth / 2 - 10);
    labelValue("House No", data.houseNo, left + contentWidth / 2, cursorY, contentWidth / 2 - 10);
    cursorY += 40;
    labelValue("House Type", data.houseType || "-", left, cursorY, contentWidth / 2 - 10);
    labelValue("Owner", data.ownerName || "-", left + contentWidth / 2, cursorY, contentWidth / 2 - 10);
    cursorY += 40;
    labelValue(
      "Area / Location",
      [data.area ? `${data.area} sq ft` : "", data.location || ""].filter(Boolean).join(" · ") || "-",
      left,
      cursorY,
      contentWidth
    );
    cursorY += 34;

    // Payment for
    labelValue("Payment For", data.paymentFor, left, cursorY, contentWidth);
    cursorY += 34;
    labelValue(
      "Payment Mode",
      data.mode + (data.transactionId ? ` · Ref ${data.transactionId}` : ""),
      left,
      cursorY,
      contentWidth / 2 - 10
    );
    labelValue(
      "Cheque / Bank",
      data.chequeNo
        ? `${data.chequeNo}${data.bankName ? ` · ${data.bankName}` : ""}${data.chequeDate ? ` · ${dateStr(data.chequeDate)}` : ""}`
        : "-",
      left + contentWidth / 2,
      cursorY,
      contentWidth / 2 - 10
    );
    cursorY += 40;

    // Amount box
    doc.save();
    doc.roundedRect(left, cursorY, contentWidth, 34, 6).fill("#eef2ff");
    doc.restore();
    doc.fontSize(11).fillColor("#334155").text("Amount Received", left + 12, cursorY + 11);
    doc.fontSize(15).fillColor("#4338ca").text(inr(data.amount), left, cursorY + 8, {
      width: contentWidth - 12,
      align: "right",
    });
    cursorY += 44;

    // Amount in words
    doc.fontSize(9).fillColor("#475569").text(numberToWords(data.amount), left, cursorY, {
      width: contentWidth,
    });
    cursorY += 24;

    // Breakdown
    const breakdown: Array<[string, number]> = [
      ["Principal", data.principal],
      ["Late Fee", data.lateFee],
      ["Advance Credit", data.advance],
    ];
    doc.fontSize(9).fillColor("#64748b");
    breakdown.forEach(([label, val]) => {
      doc.text(label, left, cursorY);
      doc.text(inr(val), left, cursorY, { width: contentWidth, align: "right" });
      cursorY += 15;
    });
    doc.fillColor("#0f172a").text("Balance Due (House)", left, cursorY);
    doc.text(inr(data.balanceDue), left, cursorY, { width: contentWidth, align: "right" });
    cursorY += 30;

    // Footer
    doc.fontSize(9).fillColor("#475569").text(`Received by: ${data.receivedBy}`, left, cursorY);
    cursorY += 28;
    doc.moveTo(left, cursorY).lineTo(left + 180, cursorY).lineWidth(0.6).strokeColor("#94a3b8").stroke();
    doc.fontSize(8).fillColor("#94a3b8").text(`Authorised Signatory · ${data.societyName}`, left, cursorY + 4, {
      width: 220,
    });
    doc.text("This is a computer generated receipt", left, doc.page.height - 60, {
      width: contentWidth,
      align: "center",
    });

    // Cancelled watermark
    if (data.cancelled) {
      doc.save();
      doc.rotate(-45, { origin: [pageWidth / 2, doc.page.height / 2] });
      doc.fontSize(70).fillColor("rgba(220, 38, 38, 0.18)").text("CANCELLED", 0, doc.page.height / 2, {
        width: pageWidth,
        align: "center",
      });
      doc.restore();
    }

    doc.end();
  });

export interface VoucherData {
  societyName: string;
  societyAddress?: string;
  societyPhone?: string;
  societyEmail?: string;
  societyLogoPath?: string;
  voucherNo: string;
  date: Date;
  financialYear: string;
  paidTo?: string;
  category: string;
  title: string;
  description?: string;
  amount: number;
  mode: string;
  referenceNo?: string;
  billNo?: string;
  isPettyCash?: boolean;
  cancelled: boolean;
  preparedBy: string;
  approvedBy?: string;
}

export const buildVoucherBuffer = (data: VoucherData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Voucher ${data.voucherNo}` } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const left = 40;
    const right = pageWidth - 40;
    const contentWidth = right - left;

    doc.save();
    doc.rect(20, 20, pageWidth - 40, doc.page.height - 40).lineWidth(1).strokeColor("#cbd5e1").stroke();
    doc.restore();

    const bandTop = 40;
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
        // ignore image errors
      }
    }

    doc.fillColor("#ffffff").text(data.societyName, headerTextLeft, bandTop + 16, {
      width: right - headerTextLeft - 16,
      align: "left",
      ellipsis: true,
    });
    doc.fontSize(9).fillColor("#e0e7ff");
    let hy = bandTop + 38;
    if (data.societyAddress) {
      doc.text(data.societyAddress, headerTextLeft, hy, { width: right - headerTextLeft - 16 });
      hy += 12;
    }
    const contactLine = [data.societyPhone, data.societyEmail].filter(Boolean).join("  |  ");
    if (contactLine) doc.text(contactLine, headerTextLeft, hy, { width: right - headerTextLeft - 16 });

    doc.fontSize(16).fillColor("#1e293b");
    doc.text("PAYMENT VOUCHER", left, bandTop + bandHeight + 18, { align: "center" });
    doc.fontSize(9).fillColor("#64748b");
    doc.text(`Financial Year ${data.financialYear}`, left, bandTop + bandHeight + 40, { align: "center" });

    let cursorY = bandTop + bandHeight + 62;

    doc.fontSize(10).fillColor("#334155");
    doc.text(`Voucher No: ${data.voucherNo}`, left, cursorY);
    doc.text(`Date: ${dateStr(data.date)}`, left + contentWidth / 2, cursorY);
    cursorY += 24;

    const labelValue = (label: string, value: string, x: number, y: number, width: number) => {
      doc.fontSize(8).fillColor("#94a3b8").text(label.toUpperCase(), x, y, { width });
      doc.fontSize(10).fillColor("#0f172a").text(value || "-", x, y + 11, { width, ellipsis: true });
    };

    labelValue("Paid To", data.paidTo || "-", left, cursorY, contentWidth / 2 - 10);
    labelValue("Category", data.category, left + contentWidth / 2, cursorY, contentWidth / 2 - 10);
    cursorY += 40;
    labelValue("Title", data.title, left, cursorY, contentWidth);
    cursorY += 34;
    if (data.description) {
      labelValue("Description", data.description, left, cursorY, contentWidth);
      cursorY += 34;
    }
    labelValue(
      "Payment Mode",
      data.mode + (data.referenceNo ? ` · Ref ${data.referenceNo}` : ""),
      left,
      cursorY,
      contentWidth / 2 - 10
    );
    labelValue("Bill No", data.billNo || "-", left + contentWidth / 2, cursorY, contentWidth / 2 - 10);
    cursorY += 40;

    doc.save();
    doc.roundedRect(left, cursorY, contentWidth, 34, 6).fill("#eef2ff");
    doc.restore();
    doc.fontSize(11).fillColor("#334155").text("Amount Paid", left + 12, cursorY + 11);
    doc.fontSize(15).fillColor("#4338ca").text(inr(data.amount), left, cursorY + 8, {
      width: contentWidth - 12,
      align: "right",
    });
    cursorY += 44;

    doc.fontSize(9).fillColor("#475569").text(numberToWords(data.amount), left, cursorY, {
      width: contentWidth,
    });
    cursorY += 30;

    if (data.isPettyCash) {
      doc.fontSize(9).fillColor("#b45309").text("Petty Cash Expense", left, cursorY);
      cursorY += 18;
    }

    // Signature boxes
    const boxWidth = (contentWidth - 24) / 3;
    const boxY = cursorY + 20;
    const boxHeight = 46;
    const labels = ["Prepared By", "Approved By", "Received By"];
    const values = [data.preparedBy, data.approvedBy || "", data.paidTo || ""];
    labels.forEach((label, i) => {
      const x = left + i * (boxWidth + 12);
      doc.roundedRect(x, boxY, boxWidth, boxHeight, 5).lineWidth(0.6).strokeColor("#cbd5e1").stroke();
      doc.fontSize(8).fillColor("#94a3b8").text(label.toUpperCase(), x + 8, boxY + 8, { width: boxWidth - 16 });
      doc.fontSize(9).fillColor("#0f172a").text(values[i] || "", x + 8, boxY + 24, {
        width: boxWidth - 16,
        ellipsis: true,
      });
    });

    doc.fontSize(8).fillColor("#94a3b8").text("This is a computer generated voucher", left, doc.page.height - 60, {
      width: contentWidth,
      align: "center",
    });

    if (data.cancelled) {
      doc.save();
      doc.rotate(-45, { origin: [pageWidth / 2, doc.page.height / 2] });
      doc.fontSize(70).fillColor("rgba(220, 38, 38, 0.18)").text("CANCELLED", 0, doc.page.height / 2, {
        width: pageWidth,
        align: "center",
      });
      doc.restore();
    }

    doc.end();
  });

export default buildReceiptBuffer;