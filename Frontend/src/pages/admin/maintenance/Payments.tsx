import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getPayments, cancelPayment, getPaymentReceiptBlob, downloadBlob } from "@/api/payment.api";
import type { Payment } from "@/types/maintenance.types";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

const modeLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

export default function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [from, to, mode, status, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    getPayments({ from: from || undefined, to: to || undefined, mode: mode || undefined, status: status || undefined, search: debouncedSearch || undefined, page, limit: 20 })
      .then((res) => {
        setPayments(res.payments);
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [from, to, mode, status, debouncedSearch, page]);

  const activeTotal = useMemo(
    () => payments.filter((p) => p.status === "active").reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const handleDownload = async (p: Payment) => {
    try {
      const blob = await getPaymentReceiptBlob(p._id);
      downloadBlob(blob, `${p.receiptNo.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const reload = async () => {
    const res = await getPayments({ from: from || undefined, to: to || undefined, mode: mode || undefined, status: status || undefined, search: debouncedSearch || undefined, page, limit: 20 });
    setPayments(res.payments);
    setTotal(res.total);
    setPages(res.pages);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSaving(true);
    try {
      await cancelPayment(cancelTarget._id, reason.trim());
      toast.success("Payment cancelled");
      setCancelTarget(null);
      setReason("");
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "receipt",
        header: "Receipt No",
        render: (row: Payment) => (
          <span className={`font-medium ${row.status === "cancelled" ? "text-slate-400 line-through" : "text-slate-900"}`}>
            {row.receiptNo}
          </span>
        ),
      },
      {
        key: "date",
        header: "Date",
        render: (row: Payment) => <span className="text-slate-700">{formatDate(row.paidOn)}</span>,
      },
      {
        key: "house",
        header: "House",
        render: (row: Payment) => (
          <span className="text-slate-700">{typeof row.houseId === "object" ? row.houseId?.houseNo || "-" : "-"}</span>
        ),
      },
      {
        key: "mode",
        header: "Mode",
        render: (row: Payment) => <span className="text-slate-700">{modeLabels[row.mode] || row.mode}</span>,
      },
      {
        key: "amount",
        header: "Amount",
        render: (row: Payment) => (
          <span className={row.status === "cancelled" ? "text-slate-400 line-through" : "font-medium text-slate-900"}>
            {formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: Payment) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {row.status === "active" ? "Active" : "Cancelled"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "150px",
        render: (row: Payment) => (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="secondary" leftIcon="download" onClick={() => handleDownload(row)}>
              Receipt
            </Button>
            {row.status === "active" && (
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
        title="Payments"
        subtitle={`Showing ${payments.length} of ${total} payments`}
        actions={<Button leftIcon="plus" onClick={() => navigate("/admin/payments/new")}>Record Payment</Button>}
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select
            label="Mode"
            placeholder="All modes"
            options={[{ value: "", label: "All modes" }, ...Object.entries(modeLabels).map(([v, l]) => ({ value: v, label: l }))]}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All"
            options={[
              { value: "", label: "All" },
              { value: "active", label: "Active" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Input label="Search" placeholder="Receipt / payer" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        </div>
      </Card>

      {loading && payments.length === 0 ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={payments}
            keyExtractor={(row) => row._id}
            loading={loading}
            emptyMessage="No payments recorded yet."
            emptyIcon="creditCard"
            striped
            hoverable
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              Active total (this page): <span className="font-medium text-slate-900">{formatCurrency(activeTotal)}</span>
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

      <Modal
        open={!!cancelTarget}
        title="Cancel Payment"
        onClose={() => setCancelTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={saving} disabled={saving || !reason.trim()}>
              Cancel Payment
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Cancel payment <span className="font-medium">{cancelTarget?.receiptNo}</span> of{" "}
          {formatCurrency(cancelTarget?.amount || 0)}? The receipt stays in history marked CANCELLED.
        </p>
        <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation" />
      </Modal>
    </div>
  );
}