import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { bulkCreateHouses, getHouseTypes, importHouses } from "@/api/house.api";
import type {
  HouseType,
  MaintenancePayableBy,
  BulkPreviewResult,
  BulkCreateResult,
  ImportResult,
} from "@/types/house.types";

const generate = (prefix: string, mFrom: number, mTo: number, sFrom?: number, sTo?: number, sep = "/"): string[] => {
  const out: string[] = [];
  const p = prefix.toUpperCase();
  const hasSub = sFrom !== undefined && sTo !== undefined;
  for (let m = mFrom; m <= mTo; m++) {
    if (hasSub) {
      for (let s = sFrom!; s <= sTo!; s++) out.push(`${p}${m}${sep}${s}`.toUpperCase());
    } else {
      out.push(`${p}${m}`.toUpperCase());
    }
  }
  return out;
};

export default function HouseBulkCreate() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<HouseType[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);

  const [form, setForm] = useState({
    houseTypeId: "",
    prefix: "",
    mainFrom: "1",
    mainTo: "1",
    subFrom: "",
    subTo: "",
    separator: "/",
    area: "",
    location: "",
    maintenancePayableBy: "owner" as MaintenancePayableBy,
  });

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    getHouseTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  const hasSub = form.subFrom !== "" && form.subTo !== "";
  const previewNos = useMemo(() => {
    const mFrom = parseInt(form.mainFrom, 10);
    const mTo = parseInt(form.mainTo, 10);
    if (Number.isNaN(mFrom) || Number.isNaN(mTo) || mFrom > mTo) return [];
    const sFrom = hasSub ? parseInt(form.subFrom, 10) : undefined;
    const sTo = hasSub ? parseInt(form.subTo, 10) : undefined;
    if (hasSub && (Number.isNaN(sFrom) || Number.isNaN(sTo) || (sFrom as number) > (sTo as number)))
      return [];
    return generate(form.prefix, mFrom, mTo, sFrom, sTo, form.separator || "/");
  }, [form, hasSub]);

  const applyPreset = (preset: "a" | "b" | "c") => {
    setResult(null);
    setPreview(null);
    if (preset === "a")
      setForm({ ...form, prefix: "A", mainFrom: "1", mainTo: "50", subFrom: "", subTo: "", separator: "/" });
    if (preset === "b")
      setForm({ ...form, prefix: "B", mainFrom: "1", mainTo: "25", subFrom: "1", subTo: "4", separator: "/" });
    if (preset === "c")
      setForm({ ...form, prefix: "C", mainFrom: "1", mainTo: "1", subFrom: "1", subTo: "16", separator: "/" });
  };

  const buildPayload = () => ({
    houseTypeId: form.houseTypeId,
    prefix: form.prefix,
    mainFrom: parseInt(form.mainFrom, 10),
    mainTo: parseInt(form.mainTo, 10),
    subFrom: hasSub ? parseInt(form.subFrom, 10) : undefined,
    subTo: hasSub ? parseInt(form.subTo, 10) : undefined,
    separator: form.separator || "/",
    area: form.area !== "" ? Number(form.area) : undefined,
    location: form.location || undefined,
    maintenancePayableBy: form.maintenancePayableBy,
  });

  const runPreview = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = (await bulkCreateHouses(buildPayload(), true)) as BulkPreviewResult;
      setPreview(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runCreate = async () => {
    setSaving(true);
    setPreview(null);
    try {
      const res = (await bulkCreateHouses(buildPayload(), false)) as BulkCreateResult;
      setResult(res);
      toast.success(`Created ${res.created}, skipped ${res.skipped}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importHouses(file);
      setImportResult(res);
      toast.success(`Imported ${res.created}, skipped ${res.skipped}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const first3 = previewNos.slice(0, 3);
  const last3 = previewNos.slice(-3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bulk Create Houses</h1>
        <button
          onClick={() => navigate("/admin/houses")}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Back to Houses
        </button>
      </div>

      <div className="rounded-lg bg-white p-5 shadow">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Presets:</span>
          <button onClick={() => applyPreset("a")} className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200">
            A1 to A50
          </button>
          <button onClick={() => applyPreset("b")} className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200">
            B1/1 to B25/4
          </button>
          <button onClick={() => applyPreset("c")} className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200">
            C1/1 to C1/16
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">House Type *</label>
            <select
              value={form.houseTypeId}
              onChange={(e) => setForm({ ...form, houseTypeId: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="">Select type</option>
              {types.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.code} - {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Prefix</label>
            <input
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              className="w-full rounded border px-3 py-2 uppercase outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Separator</label>
            <input
              value={form.separator}
              onChange={(e) => setForm({ ...form, separator: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Main From *</label>
            <input
              type="number"
              value={form.mainFrom}
              onChange={(e) => setForm({ ...form, mainFrom: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Main To *</label>
            <input
              type="number"
              value={form.mainTo}
              onChange={(e) => setForm({ ...form, mainTo: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sub From (optional)</label>
            <input
              type="number"
              value={form.subFrom}
              onChange={(e) => setForm({ ...form, subFrom: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sub To (optional)</label>
            <input
              type="number"
              value={form.subTo}
              onChange={(e) => setForm({ ...form, subTo: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Area (sq ft)</label>
            <input
              type="number"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Maintenance Payable By</label>
            <select
              value={form.maintenancePayableBy}
              onChange={(e) =>
                setForm({ ...form, maintenancePayableBy: e.target.value as MaintenancePayableBy })
              }
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="owner">Owner</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>
        </div>

        <div className="mt-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {previewNos.length === 0 ? (
            <span className="text-red-500">Enter a valid range to see house numbers.</span>
          ) : (
            <div className="space-y-1">
              <p>
                <span className="font-medium">Total:</span> {previewNos.length}
                {previewNos.length > 1000 && (
                  <span className="text-red-500"> (exceeds 1000 limit)</span>
                )}
              </p>
              <p>
                <span className="font-medium">First:</span> {first3.join(", ")}
                {previewNos.length > 3 ? ", ..." : ""}
              </p>
              <p>
                <span className="font-medium">Last:</span>{" "}
                {previewNos.length > 3 ? "..., " : ""}
                {last3.join(", ")}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={runPreview}
            disabled={saving || !form.houseTypeId || previewNos.length === 0 || previewNos.length > 1000}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Preview
          </button>
          <button
            onClick={runCreate}
            disabled={saving || !form.houseTypeId || previewNos.length === 0 || previewNos.length > 1000}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Working..." : "Create"}
          </button>
        </div>

        {preview && (
          <div className="mt-4 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
            Preview: will create <span className="font-semibold">{preview.created}</span>, will skip{" "}
            <span className="font-semibold">{preview.skipped}</span>
          </div>
        )}
        {result && (
          <div className="mt-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Created <span className="font-semibold">{result.created}</span>, skipped{" "}
            <span className="font-semibold">{result.skipped}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-2 text-lg font-semibold">Import from Excel/CSV</h2>
        <p className="mb-3 text-sm text-gray-500">
          Columns: houseNo, type, area, location, ownerName, ownerPhone, ownerEmail
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => onFile(e.target.files?.[0])}
          disabled={importing}
          className="text-sm"
        />
        {importing && <p className="mt-2 text-sm text-gray-500">Importing...</p>}
        {importResult && (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Created <span className="font-semibold">{importResult.created}</span>, skipped{" "}
              <span className="font-semibold">{importResult.skipped}</span>
            </p>
            {importResult.errors.length > 0 && (
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{e.row}</td>
                        <td className="px-3 py-2 text-red-600">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}