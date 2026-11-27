import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getExpenses,
  getExpenseCategories,
  cancelExpense,
  getExpenseVoucherBlob,
  getExpenseAttachmentBlob,
  openBlobInNewTab,
  downloadBlob,
} from "@/api/expense.api";
import type { Expense, ExpenseCategory, PaymentMode } from "@/types/finance.types";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import Badge from "@/components/common/Badge";
import ExpenseFormModal from "@/components/expenses/ExpenseFormModal";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

const modeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

const currentFY = (): number => {
  const n = new Date();
  return n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
};

const todayStr = (): string => new Date().toISOString().split("T")[0];

export default function Expenses() {
  const fyNow = currentFY();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totals, setTotals] = useState({ amount: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mode, setMode] = useState("");
  const [petty, setPetty] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [cards, setCards] = useState({ month: 0, pettyMonth: 0, fy: 0, largest: "" });

  useEffect(() => {
    getExpenseCategories()
      .then(setCategories)
      .catch((err) => toast.error(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [from, to, categoryId, mode, petty, debouncedSearch]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getExpenses({
        from: from || undefined,
        to: to || undefined,
        categoryId: categoryId || undefined,
        mode: mode || undefined,
        petty: petty || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      });
      setExpenses(res.expenses);
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
  }, [from, to, categoryId, mode, petty, debouncedSearch, page]);

  const loadCards = async () => {
    try {
      const res = await getExpenses({
        from: `${fyNow}-04-01`,
        to: todayStr(),
        status: "active",
        limit: 2000,
      });
      const now = new Date();
      let month = 0;
      let pettyMonth = 0;
      let fy = 0;
      const byCat = new Map<string, number>();
      for (const e of res.expenses) {
        fy += e.amount;
        const d = new Date(e.date);
        const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (sameMonth) {
          month += e.amount;
          if (e.isPettyCash) pettyMonth += e.amount;
        }
        const name = typeof e.categoryId === "object" ? e.categoryId?.name || "Other" : "Other";
        byCat.set(name, (byCat.get(name) || 0) + e.amount);
      }
      let largest = "";
      let max = 0;
      byCat.forEach((v, k) => {
        if (v > max) {
          max = v;
          largest = k;
        }
      });
      setCards({ month, pettyMonth, fy, largest });
    } catch {
      // cards are best-effort
    }
  };

  useEffect(() => {
    loadCards();
  }, [fyNow]);

  const categoryName = (e: Expense): string => {
    if (typeof e.categoryId === "object") return e.categoryId?.name || "-";
    return categories.find((c) => c._id === e.categoryId)?.name || "-";
  };

  const handleVoucher = async (e: Expense) => {
    try {
      const blob = await getExpenseVoucherBlob(e._id);
      openBlobInNewTab(blob);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDownloadBill = async (e: Expense) => {
    try {
      const blob = await getExpenseAttachmentBlob(e._id);
      downloadBlob(blob, `${e.voucherNo.replace(/\//g, "-")}-bill`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSaving(true);
    try {
      await cancelExpense(cancelTarget._id, reason.trim());
      toast.success("Expense cancelled");
      setCancelTarget(null);
      setReason("");
      await load();
      await loadCards();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        render: (row: Expense) => <span className="text-slate-700">{formatDate(row.date)}</span>,
      },
      {
        key: "voucher",
        header: "Voucher No",
        render: (row: Expense) => (
          <span className={row.status === "cancelled" ? "text-slate-400 line-through" : "font-medium text-slate-900"}>
            {row.voucherNo}
          </span>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (row: Expense) => (
          <span className="inline-flex items-center gap-1 text-slate-700">
            {row.isPettyCash && <Badge variant="amber">Petty</Badge>}
            {categoryName(row)}
          </span>
        ),
      },
      {
        key: "title",
        header: "Title",
        render: (row: Expense) => (
          <span className={row.status === "cancelled" ? "text-slate-400 line-through" : "text-slate-800"}>{row.title}</span>
        ),
      },
      {
        key: "paidTo",
        header: "Paid To",
        render: (row: Expense) => <span className="text-slate-700">{row.paidTo || "-"}</span>,
      },
      {
        key: "mode",
        header: "Mode",
        render: (row: Expense) => <span className="text-slate-700">{modeLabels[row.paymentMode]}</span>,
      },
      {
        key: "amount",
        header: "Amount",
        render: (row: Expense) => (
          <span className={row.status === "cancelled" ? "text-slate-400 line-through" : "font-medium text-slate-900"}>
            {formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        key: "bill",
        header: "Bill",
        width: "80px",
        render: (row: Expense) =>
          row.attachment ? (
            <Button size="sm" variant="ghost" leftIcon="download" onClick={() => handleDownloadBill(row)}>
              Bill
            </Button>
          ) : (
            <span className="text-slate-300">-</span>
          ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: Expense) => (
          <Badge variant={row.status === "active" ? "green" : "red"}>{row.status === "active" ? "Active" : "Cancelled"}</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "230px",
        render: (row: Expense) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" variant="secondary" leftIcon="file" onClick={() => handleVoucher(row)}>
              Voucher
            </Button>
            {row.status === "active" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(row);
                    setFormOpen(true);
                  }}
                >
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
    [categories, page]
  );

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`Showing ${expenses.length} of ${total} expenses`}
        actions={
          <Button
            leftIcon="plus"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Expense
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="This Month" value={formatCurrency(cards.month)} icon="calendar" color="indigo" />
        <StatCard label="This Financial Year" value={formatCurrency(cards.fy)} icon="wallet" color="green" />
        <StatCard label="Petty Cash (Month)" value={formatCurrency(cards.pettyMonth)} icon="receipt" color="amber" />
        <StatCard label="Largest Category" value={cards.largest || "-"} icon="chart" color="purple" subtext="This financial year" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select
            label="Category"
            placeholder="All categories"
            options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c._id, label: c.name }))]}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
          <Select
            label="Mode"
            placeholder="All modes"
            options={[{ value: "", label: "All modes" }, ...Object.entries(modeLabels).map(([v, l]) => ({ value: v, label: l }))]}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={petty}
                onChange={(e) => setPetty(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Petty only
            </label>
          </div>
          <Input label="Search" placeholder="Title / voucher" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        </div>
      </Card>

      {loading && expenses.length === 0 ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={expenses}
            keyExtractor={(row) => row._id}
            loading={loading}
            emptyMessage="No expenses recorded yet. Add your first expense."
            emptyIcon="receipt"
            striped
            hoverable
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              Active total (this page): <span className="font-medium text-slate-900">{formatCurrency(totals.amount)}</span> ·{" "}
              {totals.count} records
            </p>
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

      <ExpenseFormModal
        open={formOpen}
        categories={categories}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={async () => {
          await load();
          await loadCards();
          await getExpenseCategories().then(setCategories).catch(() => undefined);
        }}
      />

      <Modal
        open={!!cancelTarget}
        title="Cancel Expense"
        onClose={() => setCancelTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={saving} disabled={saving || !reason.trim()}>
              Cancel Expense
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Cancel expense <span className="font-medium">{cancelTarget?.voucherNo}</span> of{" "}
          {formatCurrency(cancelTarget?.amount || 0)}? The record stays in history marked cancelled.
        </p>
        <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation" />
      </Modal>
    </div>
  );
}