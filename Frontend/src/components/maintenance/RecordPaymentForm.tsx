import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getHouses } from "@/api/house.api";
import { getHouseLedger, getHouseShare } from "@/api/maintenance.api";
import {
  recordPayment,
  getPaymentReceiptBlob,
  openBlobInNewTab,
  downloadBlob,
} from "@/api/payment.api";
import type { House } from "@/types/house.types";
import type { MaintenanceDue, Payment, PaymentMode, PaymentKind, ShareRecord } from "@/types/maintenance.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/icons";
import Loader from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

interface Props {
  initialHouseId?: string;
  initialDueIds?: string[];
  initialKind?: PaymentKind;
  onDone?: (payment: Payment) => void;
}

const modeOptions = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function RecordPaymentForm({ initialHouseId, initialDueIds, initialKind, onDone }: Props) {
  const [houses, setHouses] = useState<House[]>([]);
  const [housesLoading, setHousesLoading] = useState(true);
  const [houseSearch, setHouseSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [houseId, setHouseId] = useState(initialHouseId || "");
  const [kind, setKind] = useState<PaymentKind>(initialKind || "maintenance");
  const [shareRecord, setShareRecord] = useState<ShareRecord | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const [dues, setDues] = useState<MaintenanceDue[]>([]);
  const [advanceCredit, setAdvanceCredit] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialDueIds || []));

  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split("T")[0]);
  const [paidBy, setPaidBy] = useState<"owner" | "tenant">("owner");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [transactionId, setTransactionId] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Payment | null>(null);

  useEffect(() => {
    getHouses({ limit: 500 })
      .then((res) => setHouses(res.houses))
      .catch(() => setHouses([]))
      .finally(() => setHousesLoading(false));
  }, []);

  const selectedHouse = houses.find((h) => h._id === houseId) || null;
  const ownerName =
    selectedHouse && typeof selectedHouse.currentOwnerId === "object"
      ? selectedHouse.currentOwnerId?.name
      : undefined;
  const tenantName =
    selectedHouse && typeof selectedHouse.currentTenantId === "object"
      ? selectedHouse.currentTenantId?.name
      : undefined;

  useEffect(() => {
    const person =
      paidBy === "owner" ? selectedHouse?.currentOwnerId : selectedHouse?.currentTenantId;
    const obj = person && typeof person === "object" ? (person as any) : null;
    setPayerName(obj?.name || "");
    setPayerPhone(obj?.phone || "");
  }, [paidBy, selectedHouse]);

  useEffect(() => {
    if (kind === "share") {
      setDues([]);
      setAdvanceCredit(0);
      return;
    }
    if (!houseId) {
      setDues([]);
      setAdvanceCredit(0);
      return;
    }
    setLedgerLoading(true);
    getHouseLedger(houseId)
      .then((res) => {
        setDues(res.dues);
        setAdvanceCredit(res.summary.advanceCredit);
        const outstanding = res.dues.filter(
          (d) => (d.status === "pending" || d.status === "partial") && d.amount - d.paidPrincipal > 0
        );
        if (initialDueIds?.length && houseId === initialHouseId) {
          const valid = new Set(outstanding.map((d) => d._id));
          const pre = initialDueIds.filter((dueId) => valid.has(dueId));
          setSelected(new Set(pre));
          const due = outstanding.find((d) => d._id === pre[0]);
          if (due) {
            setAmount(String(due.amount - due.paidPrincipal));
          }
        } else {
          setSelected(new Set());
          setAmount("");
        }
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLedgerLoading(false));
  }, [houseId, kind]);

  useEffect(() => {
    if (kind !== "share" || !houseId) {
      setShareRecord(null);
      return;
    }
    setShareLoading(true);
    getHouseShare(houseId)
      .then((rec) => {
        setShareRecord(rec);
        if (rec) {
          setAmount(String(rec.pendingAmount ?? rec.totalAmount - rec.paidAmount));
        }
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setShareLoading(false));
  }, [kind, houseId]);

  const outstandingDues = useMemo(
    () =>
      dues.filter(
        (d) => (d.status === "pending" || d.status === "partial") && d.amount - d.paidPrincipal > 0
      ),
    [dues]
  );

  const selectedDue = useMemo(
    () => outstandingDues.find((d) => selected.has(d._id)) || null,
    [outstandingDues, selected]
  );

  const selectedOutstanding = useMemo(
    () =>
      outstandingDues
        .filter((d) => selected.has(d._id))
        .reduce((s, d) => s + (d.amount - d.paidPrincipal), 0),
    [outstandingDues, selected]
  );

  const filteredHouses = useMemo(() => {
    const q = houseSearch.trim().toLowerCase();
    if (!q) return houses;
    return houses.filter((h) => {
      const owner = typeof h.currentOwnerId === "object" ? h.currentOwnerId?.name : "";
      return h.houseNo.toLowerCase().includes(q) || (owner || "").toLowerCase().includes(q);
    });
  }, [houses, houseSearch]);

  const toggleDue = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const preview = useMemo(() => {
    const amt = Number(amount) || 0;
    let remaining = amt;
    const rows = outstandingDues
      .filter((d) => selected.has(d._id))
      .map((d) => {
        const out = d.amount - d.paidPrincipal;
        const applied = Math.min(out, remaining);
        remaining -= applied;
        return { label: d.periodLabel, applied };
      });
    const advance = Math.max(0, Math.round((amt - selectedOutstanding) * 100) / 100);
    return { rows, advance };
  }, [amount, outstandingDues, selected, selectedOutstanding]);

  const sharePending = shareRecord
    ? shareRecord.pendingAmount ?? shareRecord.totalAmount - shareRecord.paidAmount
    : 0;

  const canSave =
    !!houseId &&
    (Number(amount) || 0) > 0 &&
    (kind !== "share" || (!!shareRecord && Number(amount) <= sharePending)) &&
    (mode !== "upi" && mode !== "bank_transfer" ? true : !!transactionId.trim()) &&
    (mode !== "cheque" ? true : !!chequeNo.trim() && !!bankName.trim());

  const resetAll = () => {
    setSaved(null);
    setAmount("");
    setTransactionId("");
    setChequeNo("");
    setChequeDate("");
    setBankName("");
    setRemarks("");
    setSelected(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const validDueIds = [...selected].filter((dueId) =>
        outstandingDues.some((d) => d._id === dueId)
      );
      const payload = {
        houseId,
        kind,
        amount: Number(amount),
        mode,
        paidOn,
        paidBy,
        payerName: payerName || undefined,
        payerPhone: payerPhone || undefined,
        transactionId: transactionId || undefined,
        chequeNo: chequeNo || undefined,
        chequeDate: chequeDate || undefined,
        bankName: bankName || undefined,
        remarks: remarks || undefined,
        dueIds: kind === "maintenance" && validDueIds.length ? validDueIds : undefined,
      };
      const payment = await recordPayment(payload);
      toast.success("Payment recorded");
      setSaved(payment);
      onDone?.(payment);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!saved) return;
    try {
      const blob = await getPaymentReceiptBlob(saved._id);
      downloadBlob(blob, `${saved.receiptNo.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handlePrint = async () => {
    if (!saved) return;
    try {
      const blob = await getPaymentReceiptBlob(saved._id);
      openBlobInNewTab(blob);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (saved) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Icon name="check" size={26} />
        </div>
        <h3 className="text-lg font-semibold text-green-800">Payment recorded</h3>
        <p className="mt-1 text-sm text-green-700">
          Receipt No: <span className="font-semibold">{saved.receiptNo}</span> ·{" "}
          {formatCurrency(saved.amount)}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button leftIcon="download" onClick={handleDownload}>
            Download receipt
          </Button>
          <Button variant="secondary" leftIcon="file" onClick={handlePrint}>
            Print receipt
          </Button>
          <Button variant="ghost" onClick={resetAll}>
            Record another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Select
        label="Payment Type *"
        options={[
          { value: "maintenance", label: "Maintenance" },
          { value: "share", label: "Share" },
        ]}
        value={kind === "share" ? "share" : "maintenance"}
        onChange={(e) => {
          const next = e.target.value as PaymentKind;
          setKind(next);
          setAmount("");
          setPayerName("");
          setPayerPhone("");
          if (next !== "share") setShareRecord(null);
        }}
      />

      {kind === "share" && shareLoading && <Loader />}

      {kind === "share" && shareRecord && (
        <div className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-indigo-600">Total</p>
            <p className="mt-1 font-semibold text-indigo-800">{formatCurrency(shareRecord.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-600">Paid</p>
            <p className="mt-1 font-semibold text-green-700">{formatCurrency(shareRecord.paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-600">Pending</p>
            <p className="mt-1 font-semibold text-amber-700">{formatCurrency(sharePending)}</p>
          </div>
        </div>
      )}

      {kind === "share" && !shareLoading && !shareRecord && houseId && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No share record for this house. Initialize shares first.
        </p>
      )}

      {kind !== "share" && houseId && selectedDue && (
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          Paying: {selectedHouse?.houseNo || "-"} - {selectedDue.periodLabel}
        </div>
      )}
      {/* House picker */}
      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-slate-700">House *</label>
        <div className="relative">
          <input
            value={showList ? houseSearch : selectedHouse?.houseNo || ""}
            onChange={(e) => {
              setHouseSearch(e.target.value);
              setShowList(true);
              if (houseId) {
                setHouseId("");
                setSelected(new Set());
                setAmount("");
                setPayerName("");
                setPayerPhone("");
              }
            }}
            onFocus={() => {
              setShowList(true);
              setHouseSearch("");
            }}
            placeholder={housesLoading ? "Loading houses..." : "Search house no or owner name"}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-9 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        {showList && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
            {filteredHouses.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">No houses found</p>
            ) : (
              filteredHouses.map((h) => {
                const owner = typeof h.currentOwnerId === "object" ? h.currentOwnerId?.name : "";
                return (
                  <button
                    key={h._id}
                    type="button"
                    onClick={() => {
                      setHouseId(h._id);
                      setShowList(false);
                      setSelected(new Set());
                      setAmount("");
                      setPayerName("");
                      setPayerPhone("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-indigo-50"
                  >
                    <span className="font-medium text-slate-800">{h.houseNo}</span>
                    {owner && <span className="text-xs text-slate-500">{owner}</span>}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {houseId && (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p>Owner: {ownerName || "None"}</p>
          <p>Tenant: {tenantName || "None"}</p>
          <p className="capitalize">Maintenance payable by: {selectedHouse?.maintenancePayableBy || "-"}</p>
          {advanceCredit > 0 && (
            <p className="mt-1 text-green-600">Advance credit available: {formatCurrency(advanceCredit)}</p>
          )}
        </div>
      )}

      {/* Outstanding dues */}
      {kind !== "share" && houseId && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Outstanding Dues</label>
            {outstandingDues.length > 0 && (
              <button
                type="button"
                className="text-xs text-indigo-600 hover:underline"
                onClick={() =>
                  setSelected(
                    selected.size === outstandingDues.length ? new Set() : new Set(outstandingDues.map((d) => d._id))
                  )
                }
              >
                {selected.size === outstandingDues.length ? "Clear" : "Select all"}
              </button>
            )}
          </div>
          {ledgerLoading ? (
            <Loader />
          ) : outstandingDues.length === 0 ? (
            <p className="text-sm text-slate-500">No outstanding dues for this house.</p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border">
              {outstandingDues.map((d) => (
                <label key={d._id} className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-slate-50">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(d._id)}
                      onChange={() => toggleDue(d._id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      {d.periodLabel}
                      <span className="ml-2 text-xs text-slate-400">due {formatDate(d.dueDate)}</span>
                    </span>
                  </span>
                  <span className="font-medium text-slate-800">{formatCurrency(d.amount - d.paidPrincipal)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Amount + date + paid by */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Amount (₹) *" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Date *" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        <Select
          label="Paid By *"
          options={[
            { value: "owner", label: "Owner" },
            { value: "tenant", label: "Tenant" },
          ]}
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value as "owner" | "tenant")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Payer Name" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
        <Input label="Payer Phone" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
      </div>

      {/* Mode */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Mode *" options={modeOptions} value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} />
        {(mode === "upi" || mode === "bank_transfer") && (
          <Input label="Transaction ID / UTR *" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
        )}
        {mode === "cheque" && (
          <>
            <Input label="Cheque No *" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
            <Input label="Bank Name *" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <Input label="Cheque Date" type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
          </>
        )}
      </div>

      <Input label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />

      {/* Allocation preview */}
      {(Number(amount) || 0) > 0 && selected.size > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="mb-2 text-sm font-medium text-indigo-800">Allocation preview</p>
          <div className="space-y-1 text-sm text-indigo-700">
            {preview.rows.map((r, i) => (
              <div key={i} className="flex justify-between">
                <span>{r.label}</span>
                <span>{formatCurrency(r.applied)}</span>
              </div>
            ))}
            {preview.advance > 0 && (
              <div className="flex justify-between font-medium">
                <span>Advance credit</span>
                <span>{formatCurrency(preview.advance)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={saving || !canSave} leftIcon="save">
          Save Payment
        </Button>
      </div>
    </div>
  );
}