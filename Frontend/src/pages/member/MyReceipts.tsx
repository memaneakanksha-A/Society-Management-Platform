import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getPayments, openPaymentReceipt, getErrorMessage } from "@/api/member.api";
import type { MemberPayment } from "@/types/member.types";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";

const modeLabel: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

export default function MyReceipts() {
  const [items, setItems] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPayments()
      .then((res) => {
        if (active) setItems(res);
      })
      .catch((err) => {
        if (active) toast.error(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const viewReceipt = async (id: string) => {
    setBusyId(id);
    try {
      await openPaymentReceipt(id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: "receiptNo", header: "Receipt", render: (r: MemberPayment) => <span className="font-medium text-slate-900">{r.receiptNo}</span> },
      { key: "paidOn", header: "Date", width: "130px", render: (r: MemberPayment) => <span className="text-slate-700">{formatDate(r.paidOn)}</span> },
      { key: "mode", header: "Mode", width: "130px", render: (r: MemberPayment) => <span className="text-slate-700">{modeLabel[r.mode] || r.mode}</span> },
      { key: "amount", header: "Amount", width: "120px", render: (r: MemberPayment) => <span className="font-medium text-slate-900">{formatCurrency(r.amount)}</span> },
      {
        key: "status",
        header: "Status",
        width: "110px",
        render: (r: MemberPayment) => <Badge variant={r.status === "active" ? "green" : "red"}>{r.status}</Badge>,
      },
      {
        key: "actions",
        header: "",
        width: "150px",
        render: (r: MemberPayment) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              loading={busyId === r._id}
              disabled={busyId === r._id}
              onClick={() => viewReceipt(r._id)}
              leftIcon="download"
            >
              PDF
            </Button>
          </div>
        ),
      },
    ],
    [busyId]
  );

  if (loading && items.length === 0) return <Loader />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Receipts</h1>
        <p className="mt-1 text-sm text-slate-500">{items.length} payments</p>
      </div>
      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(r) => r._id}
        loading={loading}
        emptyMessage="No payments recorded yet."
        emptyIcon="receipt"
        striped
        hoverable
      />
    </div>
  );
}