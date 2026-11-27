import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getErrorMessage } from "@/api/axios";
import { getPendingReport } from "@/api/maintenance.api";
import type { PendingItem, PendingResponse } from "@/types/maintenance.types";
import PeriodSelector, { usePeriodQuery } from "@/components/reports/PeriodSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import Loader from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

const currentFY = (): number => {
  const n = new Date();
  return n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
};

export default function PendingReport() {
  const pq = usePeriodQuery();
  const [data, setData] = useState<PendingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPendingReport(pq.year || currentFY(), {
      period: pq.period,
      month: pq.month,
      quarter: pq.quarter,
    })
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pq.year, pq.period, pq.month, pq.quarter]);

  const items = data?.dues || [];

  const handleExport = () => {
    const rows = items.map((d) => ({
      House: d.houseNo,
      Owner: d.owner || "",
      Phone: d.phone || "",
      Period: d.due.periodLabel,
      "Due Date": formatDate(d.due.dueDate),
      Outstanding: d.outstanding,
      "Late Fee": d.lateFee,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending");
    XLSX.writeFile(wb, `pending-dues-${pq.year || currentFY()}.xlsx`);
  };

  const columns = useMemo(
    () => [
      {
        key: "house",
        header: "House",
        render: (row: PendingItem) => (
          <div>
            <p className="font-medium text-slate-900">{row.houseNo}</p>
            {row.owner && <p className="text-xs text-slate-500">{row.owner}</p>}
          </div>
        ),
      },
      {
        key: "period",
        header: "Period",
        render: (row: PendingItem) => (
          <div>
            <p className="text-slate-700">{row.due.periodLabel}</p>
            <p className="text-xs text-slate-500">Due {formatDate(row.due.dueDate)}</p>
          </div>
        ),
      },
      {
        key: "phone",
        header: "Phone",
        render: (row: PendingItem) => <span className="text-slate-700">{row.phone || "-"}</span>,
      },
      {
        key: "outstanding",
        header: "Outstanding",
        render: (row: PendingItem) => <span className="font-medium text-slate-900">{formatCurrency(row.outstanding)}</span>,
      },
      {
        key: "lateFee",
        header: "Late Fee",
        render: (row: PendingItem) =>
          row.lateFee > 0 ? <span className="text-red-600">{formatCurrency(row.lateFee)}</span> : <span className="text-slate-400">-</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Pending Dues Report"
        subtitle="All outstanding maintenance dues for a financial year"
        actions={
          <Button variant="secondary" leftIcon="download" onClick={handleExport} disabled={items.length === 0}>
            Export Excel
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Dues" value={data?.summary.count || 0} icon="wallet" color="indigo" />
        <StatCard label="Total Outstanding" value={formatCurrency(data?.summary.totalOutstanding || 0)} icon="clock" color="amber" />
      </div>

      <Card className="mb-4">
        <PeriodSelector />
      </Card>

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(row) => row.due._id}
          loading={loading}
          emptyMessage="No pending dues for this year."
          emptyIcon="check"
          striped
          hoverable
        />
      )}
    </div>
  );
}