import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getHouseTypes, getHouses } from "@/api/house.api";
import {
  getMaintenanceConfig,
  saveMaintenanceConfig,
  generateDues,
} from "@/api/maintenance.api";
import type {
  Frequency,
  LateFeeRepeat,
  LateFeeType,
  MaintenanceConfig,
  GenerateResult,
} from "@/types/maintenance.types";
import type { HouseType } from "@/types/house.types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const currentFinancialYear = (): number => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

const fyLabel = (year: number): string => `${year}-${String((year + 1) % 100).padStart(2, "0")}`;

export default function MaintenanceSetup() {
  const fyNow = currentFinancialYear();
  const years = useMemo(
    () => Array.from({ length: 5 }, (_, i) => fyNow - 1 + i),
    [fyNow]
  );

  const [year, setYear] = useState(fyNow);
  const [types, setTypes] = useState<HouseType[]>([]);
  const [houseCount, setHouseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [frequency, setFrequency] = useState<Frequency>("yearly");
  const [dueDay, setDueDay] = useState("5");
  const [dueDate, setDueDate] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [lateFee, setLateFee] = useState({
    enabled: false,
    type: "flat" as LateFeeType,
    value: "50",
    graceDays: "10",
    repeat: "once" as LateFeeRepeat,
  });
  const [shareAmount, setShareAmount] = useState("");

  const [confirmGen, setConfirmGen] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getHouseTypes(), getHouses({ limit: 1 })])
      .then(([t, h]) => {
        setTypes(t);
        setHouseCount(h.total);
      })
      .catch((err) => toast.error(getErrorMessage(err)));
    return () => setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    getMaintenanceConfig(year)
      .then((cfg) => applyConfig(cfg))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [year, types.length]);

  const applyConfig = (cfg: MaintenanceConfig | null) => {
    if (!cfg) {
      setFrequency("yearly");
      setDueDay("5");
      setDueDate("");
      setAmounts({});
      setLateFee({ enabled: false, type: "flat", value: "50", graceDays: "10", repeat: "once" });
      setShareAmount("");
      return;
    }
    setFrequency(cfg.frequency);
    setDueDay(cfg.dueDay ? String(cfg.dueDay) : "5");
    setDueDate(cfg.dueDate || "");
    const map: Record<string, string> = {};
    cfg.amounts?.forEach((a) => (map[a.houseTypeId] = String(a.amount)));
    setAmounts(map);
    setLateFee({
      enabled: cfg.lateFee?.enabled ?? false,
      type: cfg.lateFee?.type ?? "flat",
      value: String(cfg.lateFee?.value ?? 0),
      graceDays: String(cfg.lateFee?.graceDays ?? 0),
      repeat: cfg.lateFee?.repeat ?? "once",
    });
    setShareAmount(cfg.shareAmountPerHouse !== undefined ? String(cfg.shareAmountPerHouse) : "");
  };

  const lateFeePreview = (): string => {
    if (!lateFee.enabled) return "No late fee";
    const val = lateFee.type === "percent" ? `${lateFee.value}%` : `Rs ${lateFee.value}`;
    const grace = lateFee.graceDays ? `${lateFee.graceDays} grace days` : "after the due date";
    const rep = lateFee.repeat === "monthly" ? " (repeats every month)" : " (one time)";
    return `${val} flat ${grace}${rep}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<MaintenanceConfig> = {
        year,
        frequency,
        lateFee: {
          enabled: lateFee.enabled,
          type: lateFee.type,
          value: Number(lateFee.value) || 0,
          graceDays: Number(lateFee.graceDays) || 0,
          repeat: lateFee.repeat,
        },
        amounts: types
          .map((t) => ({ houseTypeId: t._id, amount: Number(amounts[t._id]) || 0 }))
          .filter((a) => a.amount > 0),
      };
      if (frequency === "monthly") payload.dueDay = Number(dueDay) || 1;
      if (frequency === "yearly") payload.dueDate = dueDate || undefined;
      if (shareAmount) payload.shareAmountPerHouse = Number(shareAmount);
      await saveMaintenanceConfig(payload);
      toast.success("Configuration saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateDues(year);
      setResult(res);
      setConfirmGen(false);
      toast.success(`${res.created} dues generated`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Maintenance Setup"
        subtitle="Configure maintenance for a financial year, then generate dues for all houses."
      />

      <Card className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Financial Year"
            options={years.map((y) => ({ value: String(y), label: `FY ${fyLabel(y)}` }))}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <Select
            label="Frequency"
            options={[
              { value: "yearly", label: "Yearly" },
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
            ]}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {frequency === "monthly" ? (
            <Input
              label="Due Day (1-28)"
              type="number"
              min={1}
              max={28}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          ) : frequency === "yearly" ? (
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          ) : (
            <div className="text-sm text-slate-500">Quarterly dues use day {dueDay || 1} of Apr/Jul/Oct/Jan.</div>
          )}
          {frequency === "quarterly" && (
            <Input
              label="Due Day (1-28)"
              type="number"
              min={1}
              max={28}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          )}
        </div>
      </Card>

      <Card className="mb-5">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Amount per House Type</h3>
        {types.length === 0 ? (
          <p className="text-sm text-slate-500">No house types found. Create house types first.</p>
        ) : (
          <div className="space-y-3">
            {types.map((t) => (
              <div key={t._id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-slate-700">
                  {t.code} · {t.name}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Amount (₹)"
                  value={amounts[t._id] ?? ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [t._id]: e.target.value }))}
                  className="max-w-xs"
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Late Fee</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lateFee.enabled}
              onChange={(e) => setLateFee((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Enabled
          </label>
        </div>
        {lateFee.enabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <Select
                label="Type"
                options={[
                  { value: "flat", label: "Flat (₹)" },
                  { value: "percent", label: "Percent (%)" },
                ]}
                value={lateFee.type}
                onChange={(e) => setLateFee((f) => ({ ...f, type: e.target.value as LateFeeType }))}
              />
              <Input
                label="Value"
                type="number"
                min={0}
                value={lateFee.value}
                onChange={(e) => setLateFee((f) => ({ ...f, value: e.target.value }))}
              />
              <Input
                label="Grace Days"
                type="number"
                min={0}
                value={lateFee.graceDays}
                onChange={(e) => setLateFee((f) => ({ ...f, graceDays: e.target.value }))}
              />
              <Select
                label="Repeat"
                options={[
                  { value: "once", label: "One time" },
                  { value: "monthly", label: "Every month" },
                ]}
                value={lateFee.repeat}
                onChange={(e) => setLateFee((f) => ({ ...f, repeat: e.target.value as LateFeeRepeat }))}
              />
            </div>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Preview: {lateFeePreview()}
            </p>
          </>
        )}
      </Card>

      <Card className="mb-5">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Shares</h3>
        <Input
          label="Share amount per house (optional)"
          type="number"
          min={0}
          placeholder="e.g., 5000"
          value={shareAmount}
          onChange={(e) => setShareAmount(e.target.value)}
          className="max-w-xs"
        />
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          Save Configuration
        </Button>
        <Button
          variant="secondary"
          leftIcon="refresh"
          onClick={() => setConfirmGen(true)}
          disabled={generating}
        >
          Generate dues for all houses
        </Button>
      </div>

      <ConfirmDialog
        open={confirmGen}
        title="Generate Dues"
        message={`Generate ${frequency} dues for FY ${fyLabel(year)} for all ${houseCount} houses? Houses whose type has no amount will be skipped. Existing dues are not duplicated.`}
        confirmText="Generate"
        loading={generating}
        onConfirm={handleGenerate}
        onCancel={() => setConfirmGen(false)}
        confirmVariant="indigo"
      />

      <Modal
        open={!!result}
        title="Generation Result"
        onClose={() => setResult(null)}
        footer={
          <Button onClick={() => setResult(null)}>Done</Button>
        }
      >
        {result && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-slate-900">Created:</span> {result.created}
            </p>
            <p>
              <span className="font-medium text-slate-900">Skipped (no amount / invalid type):</span>{" "}
              {result.skipped}
            </p>
            <p>
              <span className="font-medium text-slate-900">Advance credit applied:</span> ₹
              {result.advanceApplied.toLocaleString("en-IN")}
            </p>
            {result.skippedHouses.length > 0 && (
              <div>
                <p className="font-medium text-slate-900">Houses skipped:</p>
                <p className="text-slate-600">{result.skippedHouses.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}