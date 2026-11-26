import * as XLSX from "xlsx";
import mongoose from "mongoose";
import House from "../models/House";
import HouseType from "../models/HouseType";
import Owner from "../models/Owner";

interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export const importHousesFromFile = async (
  buffer: Buffer,
  societyId: string
): Promise<ImportResult> => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No worksheet found in file");

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
    defval: "",
  });

  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNo = i + 2;
    const houseNoRaw = String(row.houseNo ?? "").trim();
    const typeRaw = String(row.type ?? "").trim();

    if (!houseNoRaw) {
      result.errors.push({ row: rowNo, message: "houseNo is required" });
      continue;
    }

    const houseNo = houseNoRaw.toUpperCase();

    if (!typeRaw) {
      result.errors.push({ row: rowNo, message: "type is required" });
      continue;
    }

    const houseType = await HouseType.findOne({
      societyId,
      code: typeRaw.toUpperCase(),
    });
    if (!houseType) {
      result.errors.push({ row: rowNo, message: `Unknown type code: ${typeRaw}` });
      continue;
    }

    const existing = await House.findOne({ societyId, houseNo }).select("_id");
    if (existing) {
      result.skipped++;
      continue;
    }

    const house = await House.create({
      societyId,
      houseTypeId: houseType._id,
      houseNo,
      area: row.area !== "" && row.area !== undefined ? Number(row.area) : undefined,
      location: row.location ? String(row.location) : undefined,
    });

    const ownerName = String(row.ownerName ?? "").trim();
    if (ownerName) {
      const owner = await Owner.create({
        societyId,
        houseId: house._id,
        name: ownerName,
        phone: row.ownerPhone ? String(row.ownerPhone) : undefined,
        email: row.ownerEmail ? String(row.ownerEmail) : undefined,
        isCurrent: true,
      });
      house.currentOwnerId = owner._id as mongoose.Types.ObjectId;
      await house.save();
    }

    result.created++;
  }

  return result;
};