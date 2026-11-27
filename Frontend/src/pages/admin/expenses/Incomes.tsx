import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getIncomes,
  createIncome,
  updateIncome,
  cancelIncome,
} from "@/api/expense.api";
import type { Income, IncomeSource, PaymentMode } from "@/types/finance.types";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import Badge from "@/components/common/Badge";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

const sourceLabels: Record<IncomeSource, string> = {
  interest: "Interest",
  hall_rent: "Hall Rent",
  penalty: "Penalty",
  donation: "Donation",
  scrap: "Scrap",
  other: "Other",
};

const modeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

const todayStr = (): string => new Date().toISOString().split("T")[0];

interface FormState {
  date: string;
  source: IncomeSource;
  title: string;
  amount: string;
  mode: PaymentMode;
  referenceNo: string;
  receivedFrom: string;
  remarks: string;
}

const emptyForm = (): FormState => ({
  date: todayStr(),
  source: "other",
  title: "",
  amount: "",
  mode: "cash",
  referenceNo: "",
  receivedFrom: "",
  remarks: "",
});

export default function Incomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totals, setTotals] = useState({ amount: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Income | null>(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [from, to, source, debouncedSearch]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getIncomes({
        from: from || undefined,
        to: to || undefined,
        source: source || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      });
      setIncomes(res.incomes);
      setTotal(res.total);
      setPages(res.pages);
      setTotals(res.totals);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [from, to, source, debouncedSearch, page]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (i: Income) => {
    setEditing(i);
    setForm({
      date: i.date ? i.date.split("T")[0] : todayStr(),
      source: i.source,
      title: i.title,
      amount: String(i.amount ?? ""),
      mode: i.mode,
      referenceNo: i.referenceNo || "",
      receivedFrom: i.receivedFrom || "",
      remarks: i.remarks || "",
    });
    setFormOpen(true);
  };

  const canSave = !!form.title.trim() && (Number(form.amount) || 0) > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        source: form.source,
        title: form.title.trim(),
        amount: Number(form.amount),
        mode: form.mode,
        referenceNo: form.referenceNo.trim() || undefined,
        receivedFrom: form.receivedFrom.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      };
      if (editing) await updateIncome(editing._id, payload);
      else await createIncome(payload);
      toast.success(editing ? "Income updated" : "Income added");
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setCancelling(true);
    try {
      await cancelIncome(cancelTarget._id, reason.trim());
      toast.success("Income cancelled");
      setCancelTarget(null);
      setReason("");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        render: (row: Income) => <span className="text-slate-700">{formatDate(row.date)}</span>,
      },
      {
        key: "incomeNo",
        header: "Income No",
        render: (row: Income) => (
          <span className={row.status === "cancelled" ? "text-slate-400 line-through" : "font-medium text-slate-900"}>
            {row.incomeNo}
          </span>
        ),
      },
      {
        key: "source",
        header: "Source",
        render: (row: Income) => <Badge variant="indigo">{sourceLabels[row.source]}</Badge>,
      },
      {
        key: "title",
        header: "Title",
        render: (row: Income) => (
          <span className={row.status === "cancelled" ? "text-slate-400 line-through" : "text-slate-800"}>{row.title}</span>
        ),
      },
      {
        key: "receivedFrom",
        header: "Received From",
        render: (row: Income) => <span className="text-slate-700">{row.receivedFrom || "-"}</span>,
      },
      {
        key: "mode",
        header: "Mode",
        render: (row: Income) => <span className="text-slate-700">{modeLabels[row.mode]}</span>,
      },
      {
        key: "amount",
        header: "Amount",
        render: (row: Income) => (
          <span className={row.status === "cancelled" ? "text-slate-400 line-through" : "font-medium text-slate-900"}>
            {formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: Income) => (
          <Badge variant={row.status === "active" ? "green" : "red"}>{row.status === "active" ? "Active" : "Cancelled"}</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "170px",
        render: (row: Income) => (
          <div className="flex items-center justify-end gap-1.5">
            {row.status === "active" && (
              <>
                <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCancelTarget(row);
                    setReason("");
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Other Income"
        subtitle={`Showing ${incomes.length} of ${total} income entries`}
        actions={<Button leftIcon="plus" onClick={openAdd}>Add Income</Button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active Total (page)" value={formatCurrency(totals.amount)} icon="wallet" color="green" />
        <StatCard label="Entries" value={totals.count} icon="receipt" color="indigo" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select
            label="Source"
            placeholder="All sources"
            options={[{ value: "", label: "All sources" }, ...Object.entries(sourceLabels).map(([v, l]) => ({ value: v, label: l }))]}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <Input label="Search" placeholder="Title / income no" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        </div>
      </Card>

      {loading && incomes.length === 0 ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={incomes}
            keyExtractor={(row) => row._id}
            loading={loading}
            emptyMessage="No other income recorded yet."
            emptyIcon="wallet"
            striped
            hoverable
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} entries</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-slate-600">
                Page {page} of {pages}
              </span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit Income" : "Add Income"}
        onClose={() => setFormOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={saving || !canSave} leftIcon="save">
              {editing ? "Save" : "Add Income"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Select
              label="Source *"
              options={Object.entries(sourceLabels).map(([v, l]) => ({ value: v, label: l }))}
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as IncomeSource }))}
            />
          </div>
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount (₹) *" type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Select
              label="Mode *"
              options={Object.entries(modeLabels).map(([v, l]) => ({ value: v, label: l }))}
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as PaymentMode }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Received From" value={form.receivedFrom} onChange={(e) => setForm((f) => ({ ...f, receivedFrom: e.target.value }))} />
            <Input label="Reference No" value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
          </div>
          <Textarea label="Remarks" rows={2} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={!!cancelTarget}
        title="Cancel Income"
        onClose={() => setCancelTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelling} disabled={cancelling || !reason.trim()}>
              Cancel Income
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Cancel income <span className="font-medium">{cancelTarget?.incomeNo}</span> of{" "}
          {formatCurrency(cancelTarget?.amount || 0)}? The record stays in history marked cancelled.
        </p>
        <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation" />
      </Modal>
    </div>
  );
}