import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getDues, getErrorMessage } from "@/api/member.api";
import type { MemberDuesResponse, MemberDue } from "@/types/member.types";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";

const statusVariant = (s: MemberDue["status"]): "green" | "amber" | "red" | "gray" =>
  s === "paid" ? "green" : s === "partial" ? "amber" : s === "cancelled" ? "gray" : "red";

export default function MyDues() {
  const [data, setData] = useState<MemberDuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDues(year || undefined)
      .then((res) => {
        if (active) setData(res);
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
  }, [year]);

  const years = useMemo(() => {
    const set = new Set<number>();
    (data?.dues || []).forEach((d) => set.add(d.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [data]);

  const columns = useMemo(
    () => [
      { key: "periodLabel", header: "Period", render: (r: MemberDue) => <span className="font-medium text-slate-900">{r.periodLabel}</span> },
      { key: "year", header: "Year", width: "90px", render: (r: MemberDue) => <span className="text-slate-700">{r.year}</span> },
      { key: "dueDate", header: "Due Date", width: "130px", render: (r: MemberDue) => <span className="text-slate-700">{formatDate(r.dueDate)}</span> },
      { key: "amount", header: "Amount", width: "120px", render: (r: MemberDue) => <span className="text-slate-900">{formatCurrency(r.amount)}</span> },
      {
        key: "balance",
        header: "Balance",
        width: "120px",
        render: (r: MemberDue) => (
          <span className="font-medium text-slate-900">{formatCurrency(Math.max(0, r.amount - r.paidPrincipal))}</span>
        ),
      },
      {
        key: "lateFee",
        header: "Late Fee",
        width: "110px",
        render: (r: MemberDue) => <span className="text-slate-700">{formatCurrency(r.lateFeePaid)}</span>,
      },
      {
        key: "status",
        header: "Status",
        width: "110px",
        render: (r: MemberDue) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
    ],
    []
  );

  if (loading && !data) return <Loader />;

  if (data && !data.payable) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Dues</h1>
        <Card>
          <p className="text-sm text-slate-600">
            Maintenance for this house is payable by the owner. You do not have any dues to view.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dues</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Outstanding ${formatCurrency(data.totalOutstanding)} · Late fee ${formatCurrency(data.totalLateFee)}` : ""}
          </p>
        </div>
        {years.length > 0 && (
          <div className="w-full sm:w-48">
            <Select
              placeholder="All years"
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.dues || []}
        keyExtractor={(r) => r._id}
        loading={loading}
        emptyMessage="No dues found."
        emptyIcon="wallet"
        striped
        hoverable
      />
    </div>
  );
}