import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getErrorMessage } from "@/api/axios";
import { bulkCreateHouses, getHouseTypes, importHouses } from "@/api/house.api";
import type {
  HouseType,
  MaintenancePayableBy,
  BulkPreviewResult,
  BulkCreateResult,
  ImportResult,
} from "@/types/house.types";

const generate = (
  prefix: string,
  mFrom: number,
  mTo: number,
  sFrom?: number,
  sTo?: number,
  sep = "/"
): string[] => {
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

type Step = 1 | 2 | 3;
type PatternMode = "simple" | "block";

interface FormState {
  houseTypeId: string;
  prefix: string;
  patternMode: PatternMode;
  // Simple pattern
  simpleStart: string;
  simpleEnd: string;
  // Block pattern
  blockPrefix: string;
  blockFrom: string;
  blockTo: string;
  housesPerBlock: string;
  blockStartCustom: string;
  blockStartEnabled: boolean;
  separator: string;
  // Common
  area: string;
  location: string;
  maintenancePayableBy: MaintenancePayableBy;
}

const initialForm: FormState = {
  houseTypeId: "",
  prefix: "",
  patternMode: "simple",
  simpleStart: "1",
  simpleEnd: "50",
  blockPrefix: "",
  blockFrom: "1",
  blockTo: "25",
  housesPerBlock: "4",
  blockStartCustom: "1",
  blockStartEnabled: false,
  separator: "/",
  area: "",
  location: "",
  maintenancePayableBy: "owner",
};

export default function HouseBulkCreate() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<HouseType[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [prefixWarning, setPrefixWarning] = useState("");

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);

  useEffect(() => {
    getHouseTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  // Auto-select house type when prefix matches a type code
  useEffect(() => {
    if (!form.prefix) return;
    const matchingType = types.find((t) => t.code.toUpperCase() === form.prefix.toUpperCase());
    if (matchingType && form.houseTypeId !== matchingType._id) {
      setForm((prev) => ({ ...prev, houseTypeId: matchingType._id }));
    }
  }, [form.prefix, types]);

  // Prefix vs type code warning
  useEffect(() => {
    if (!form.prefix || !form.houseTypeId) {
      setPrefixWarning("");
      return;
    }
    const selectedType = types.find((t) => t._id === form.houseTypeId);
    if (selectedType && selectedType.code.toUpperCase() !== form.prefix.toUpperCase()) {
      setPrefixWarning(
        `You selected type ${selectedType.code} but numbers start with ${form.prefix.toUpperCase()}. Continue?`
      );
    } else {
      setPrefixWarning("");
    }
  }, [form.prefix, form.houseTypeId, types]);

  const previewNos = useMemo(() => {
    if (form.patternMode === "simple") {
      const mFrom = parseInt(form.simpleStart, 10);
      const mTo = parseInt(form.simpleEnd, 10);
      if (Number.isNaN(mFrom) || Number.isNaN(mTo) || mFrom > mTo) return [];
      return generate(form.prefix, mFrom, mTo);
    } else {
      const mFrom = parseInt(form.blockFrom, 10);
      const mTo = parseInt(form.blockTo, 10);
      const sTo = parseInt(form.housesPerBlock, 10);
      if (Number.isNaN(mFrom) || Number.isNaN(mTo) || mFrom > mTo) return [];
      if (Number.isNaN(sTo) || sTo < 1) return [];
      const sFrom = form.blockStartEnabled ? parseInt(form.blockStartCustom, 10) : 1;
      if (form.blockStartEnabled && (Number.isNaN(sFrom) || sFrom < 1)) return [];
      return generate(form.blockPrefix || form.prefix, mFrom, mTo, sFrom, sTo, form.separator || "/");
    }
  }, [form]);

  const typeHouseCount = useMemo(() => {
    if (!form.houseTypeId) return 0;
    const t = types.find((ty) => ty._id === form.houseTypeId);
    return t?.houseCount ?? 0;
  }, [form.houseTypeId, types]);

  const applyPreset = (preset: "a" | "b" | "c") => {
    setResult(null);
    setPreview(null);
    if (preset === "a") {
      setForm((prev) => ({
        ...prev,
        prefix: "A",
        patternMode: "simple",
        simpleStart: "1",
        simpleEnd: "50",
      }));
    }
    if (preset === "b") {
      setForm((prev) => ({
        ...prev,
        prefix: "B",
        patternMode: "block",
        blockPrefix: "B",
        blockFrom: "1",
        blockTo: "25",
        housesPerBlock: "4",
      }));
    }
    if (preset === "c") {
      setForm((prev) => ({
        ...prev,
        prefix: "C",
        patternMode: "block",
        blockPrefix: "C",
        blockFrom: "1",
        blockTo: "10",
        housesPerBlock: "16",
      }));
    }
  };

  const buildPayload = () => {
    if (form.patternMode === "simple") {
      return {
        houseTypeId: form.houseTypeId,
        prefix: form.prefix,
        mainFrom: parseInt(form.simpleStart, 10),
        mainTo: parseInt(form.simpleEnd, 10),
        separator: "/",
        area: form.area !== "" ? Number(form.area) : undefined,
        location: form.location || undefined,
        maintenancePayableBy: form.maintenancePayableBy,
      };
    } else {
      const sFrom = form.blockStartEnabled ? parseInt(form.blockStartCustom, 10) : 1;
      const sTo = parseInt(form.housesPerBlock, 10);
      return {
        houseTypeId: form.houseTypeId,
        prefix: form.blockPrefix || form.prefix,
        mainFrom: parseInt(form.blockFrom, 10),
        mainTo: parseInt(form.blockTo, 10),
        subFrom: sFrom,
        subTo: sTo,
        separator: form.separator || "/",
        area: form.area !== "" ? Number(form.area) : undefined,
        location: form.location || undefined,
        maintenancePayableBy: form.maintenancePayableBy,
      };
    }
  };

  const runPreview = async () => {
    if (!form.houseTypeId || previewNos.length === 0 || previewNos.length > 1000) return;
    setSaving(true);
    setResult(null);
    try {
      const res = (await bulkCreateHouses(buildPayload(), true)) as BulkPreviewResult;
      setPreview(res);
      setStep(3);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runCreate = async () => {
    if (!form.houseTypeId || previewNos.length === 0 || previewNos.length > 1000) return;
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

  const downloadSample = async () => {
    setDownloadingSample(true);
    try {
      const wb = XLSX.utils.book_new();
      const sampleData = [
        { houseNo: "A1", type: "A", area: 1200, location: "Ground Floor", ownerName: "", ownerPhone: "", ownerEmail: "" },
        { houseNo: "A2", type: "A", area: 1200, location: "First Floor", ownerName: "", ownerPhone: "", ownerEmail: "" },
        { houseNo: "B1/1", type: "B", area: 900, location: "Block 1", ownerName: "", ownerPhone: "", ownerEmail: "" },
        { houseNo: "B1/2", type: "B", area: 900, location: "Block 1", ownerName: "", ownerPhone: "", ownerEmail: "" },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, "Houses");
      XLSX.writeFile(wb, "house-import-sample.xlsx");
      toast.success("Sample file downloaded");
    } catch (err) {
      toast.error("Failed to generate sample file");
    } finally {
      setDownloadingSample(false);
    }
  };

  const first5 = previewNos.slice(0, 5);
  const last5 = previewNos.slice(-5);
  const blockSample = previewNos.slice(0, 2 * parseInt(form.housesPerBlock || "4", 10));

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

      {/* Step indicator */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className="w-16 h-1 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span className="text-center w-24">Step 1: Type</span>
          <span className="text-center w-24">Step 2: Numbers</span>
          <span className="text-center w-24">Step 3: Create</span>
        </div>
      </div>

      {/* Step 1: Which type of houses? */}
      {step === 1 && (
        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-semibold">Step 1: Which type of houses?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
                    {t.code} - {t.name} ({t.houseCount ?? 0} existing)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Prefix Letter</label>
              <input
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
                maxLength={2}
                className="w-full rounded border px-3 py-2 uppercase outline-none focus:border-indigo-500"
                placeholder="e.g. A, B, C"
              />
              <p className="mt-1 text-xs text-gray-500">
                The letter your house numbers start with. Matches a type code to auto-select.
              </p>
            </div>
          </div>
          {typeHouseCount > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              This type already has <span className="font-medium">{typeHouseCount}</span> house{typeHouseCount !== 1 ? "s" : ""}.
            </p>
          )}
          {prefixWarning && (
            <div className="mt-3 rounded bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              {prefixWarning}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={!form.houseTypeId}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Next: How are numbers written?
            </button>
          </div>
        </div>
      )}

      {/* Step 2: How are the house numbers written? */}
      {step === 2 && (
        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-semibold">Step 2: How are the house numbers written?</h2>

          {/* Pattern selector cards */}
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, patternMode: "simple" }))}
              className={`rounded-lg border-2 p-4 transition-colors ${
                form.patternMode === "simple"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <h3 className="font-semibold text-gray-900">Simple numbers</h3>
              <p className="mt-1 text-sm text-gray-500">Example: A1, A2, A3 … A50</p>
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, patternMode: "block" }))}
              className={`rounded-lg border-2 p-4 transition-colors ${
                form.patternMode === "block"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <h3 className="font-semibold text-gray-900">Block and house number</h3>
              <p className="mt-1 text-sm text-gray-500">Example: B1/1, B1/2 … B25/4</p>
            </button>
          </div>

          {/* Simple pattern fields */}
          {form.patternMode === "simple" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Prefix</label>
                <input
                  value={form.prefix}
                  onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="w-full rounded border px-3 py-2 uppercase outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Start number *</label>
                <input
                  type="number"
                  value={form.simpleStart}
                  onChange={(e) => setForm({ ...form, simpleStart: e.target.value })}
                  className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">End number *</label>
                <input
                  type="number"
                  value={form.simpleEnd}
                  onChange={(e) => setForm({ ...form, simpleEnd: e.target.value })}
                  className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Block pattern fields */}
          {form.patternMode === "block" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Block Prefix</label>
                <input
                  value={form.blockPrefix}
                  onChange={(e) => setForm({ ...form, blockPrefix: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="w-full rounded border px-3 py-2 uppercase outline-none focus:border-indigo-500"
                  placeholder="e.g. B"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">From block *</label>
                <input
                  type="number"
                  value={form.blockFrom}
                  onChange={(e) => setForm({ ...form, blockFrom: e.target.value })}
                  className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">To block *</label>
                <input
                  type="number"
                  value={form.blockTo}
                  onChange={(e) => setForm({ ...form, blockTo: e.target.value })}
                  className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Houses per block *</label>
                <input
                  type="number"
                  value={form.housesPerBlock}
                  onChange={(e) => setForm({ ...form, housesPerBlock: e.target.value })}
                  min="1"
                  className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.blockStartEnabled}
                    onChange={(e) => setForm({ ...form, blockStartEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm">Custom start number</span>
                </label>
                {form.blockStartEnabled && (
                  <input
                    type="number"
                    value={form.blockStartCustom}
                    onChange={(e) => setForm({ ...form, blockStartCustom: e.target.value })}
                    min="1"
                    className="mt-2 w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
                    placeholder="e.g. 1"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Separator</label>
                <input
                  value={form.separator}
                  onChange={(e) => setForm({ ...form, separator: e.target.value })}
                  maxLength={2}
                  className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Helper text for block pattern */}
          {form.patternMode === "block" && (
            <p className="mt-3 text-sm text-gray-500">
              Block 1 with 4 houses gives B1/1, B1/2, B1/3, B1/4
            </p>
          )}

          {/* Live preview */}
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
                  <span className="font-medium">First:</span> {first5.join(", ")}
                  {previewNos.length > 5 ? ", ..." : ""}
                </p>
                <p>
                  <span className="font-medium">Last:</span>{" "}
                  {previewNos.length > 5 ? "..., " : ""}
                  {last5.join(", ")}
                </p>
                {form.patternMode === "block" && blockSample.length > 0 && (
                  <p className="mt-2">
                    <span className="font-medium">Sample (first 2 blocks):</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {blockSample.map((n, i) => (
                        <span
                          key={i}
                          className="rounded bg-white border px-2 py-0.5 text-xs font-mono"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Presets */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="self-center text-sm text-gray-500">Presets:</span>
            <button onClick={() => applyPreset("a")} className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200">
              A1 to A50
            </button>
            <button onClick={() => applyPreset("b")} className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200">
              B1/1 to B25/4
            </button>
            <button onClick={() => applyPreset("c")} className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200">
              C1/1 to C10/16
            </button>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={runPreview}
              disabled={saving || !form.houseTypeId || previewNos.length === 0 || previewNos.length > 1000}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Checking..." : "Check for duplicates & continue"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Check and create */}
      {step === 3 && (
        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-semibold">Step 3: Check and create</h2>

          {preview && (
            <div className="mb-4 space-y-2">
              <div className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                Preview: will create <span className="font-semibold">{preview.created}</span>, will skip{" "}
                <span className="font-semibold">{preview.skipped}</span> (already exist)
              </div>
              {preview.skippedList.length > 0 && (
                <details className="rounded border bg-gray-50">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700">
                    Show {preview.skippedList.length} skipped numbers
                  </summary>
                  <div className="px-3 pb-2 text-xs text-gray-600 flex flex-wrap gap-1">
                    {preview.skippedList.map((n, i) => (
                      <span key={i} className="rounded bg-white border px-1.5 py-0.5 font-mono">
                        {n}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {result && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Created <span className="font-semibold">{result.created}</span>, skipped{" "}
              <span className="font-semibold">{result.skipped}</span>
              <button
                onClick={() => navigate("/admin/houses")}
                className="ml-4 text-indigo-600 hover:underline"
              >
                View these houses
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep(2);
                setPreview(null);
              }}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back
            </button>
            {preview && !result && (
              <button
                onClick={runCreate}
                disabled={saving}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create houses"}
              </button>
            )}
            {result && (
              <button
                onClick={() => {
                  setForm(initialForm);
                  setResult(null);
                  setPreview(null);
                  setStep(1);
                }}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Create more
              </button>
            )}
          </div>
        </div>
      )}

      {/* How does this work? collapsible */}
      <details className="rounded-lg bg-white p-5 shadow">
        <summary className="cursor-pointer font-medium text-gray-900">How does this work?</summary>
        <div className="mt-4 space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold">A: Simple numbers</h4>
            <p>Prefix <strong>A</strong>, start <strong>1</strong>, end <strong>50</strong> → A1, A2, A3 … A50</p>
          </div>
          <div>
            <h4 className="font-semibold">B: Block and house number</h4>
            <p>Block prefix <strong>B</strong>, blocks <strong>1 to 25</strong>, <strong>4</strong> houses per block → B1/1, B1/2, B1/3, B1/4, B2/1 … B25/4</p>
          </div>
          <div>
            <h4 className="font-semibold">C: Custom block start</h4>
            <p>Block prefix <strong>C</strong>, blocks <strong>1 to 10</strong>, <strong>16</strong> houses per block, custom start <strong>1</strong> → C1/1 … C10/16</p>
          </div>
          <p className="text-xs text-gray-500">
            The prefix letter should match your house type code (e.g. type "A" for prefix "A").
            Maximum 1,000 houses per request.
          </p>
        </div>
      </details>

      {/* Import from Excel */}
      <div className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-2 text-lg font-semibold">Import from Excel</h2>
        <p className="mb-3 text-sm text-gray-500">
          Columns: houseNo, type, area, location, ownerName, ownerPhone, ownerEmail
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => onFile(e.target.files?.[0])}
            disabled={importing}
            className="text-sm"
          />
          <button
            onClick={downloadSample}
            disabled={downloadingSample}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {downloadingSample ? "Generating..." : "Download sample file"}
          </button>
        </div>
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