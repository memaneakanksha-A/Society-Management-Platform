import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getErrorMessage } from "@/api/axios";
import { getDefaulters } from "@/api/maintenance.api";
import type { Defaulter } from "@/types/maintenance.types";
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

const digitsOnly = (phone: string): string => phone.replace(/\D/g, "");

export default function Defaulters() {
  const pq = usePeriodQuery();
  const [rows, setRows] = useState<Defaulter[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDefaulters(pq.year || currentFY(), {
      period: pq.period,
      month: pq.month,
      quarter: pq.quarter,
    })
      .then((res) => {
        setRows(res.defaulters);
        setTotal(res.total);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pq.year, pq.period, pq.month, pq.quarter]);

  const totals = useMemo(() => {
    let principal = 0;
    let lateFee = 0;
    rows.forEach((d) => {
      principal += d.principalPending;
      lateFee += d.lateFee;
    });
    return { principal, lateFee, grand: principal + lateFee };
  }, [rows]);

  const whatsappUrl = (d: Defaulter): string => {
    const phone = d.phone ? digitsOnly(d.phone) : "";
    const msg = `Dear ${d.owner || "Resident"}, this is a reminder that maintenance for house ${d.houseNo} is pending. Outstanding: ${formatCurrency(
      d.principalPending + d.lateFee
    )} (principal ${formatCurrency(d.principalPending)} + late fee ${formatCurrency(d.lateFee)}). Please pay at the earliest. - Society Office`;
    return `https://wa.me/${phone ? `91${phone}` : ""}?text=${encodeURIComponent(msg)}`;
  };

  const handleExport = () => {
    const data = rows.map((d) => ({
      House: d.houseNo,
      Owner: d.owner || "",
      Phone: d.phone || "",
      "Overdue Periods": d.overduePeriods,
      "Principal Pending": d.principalPending,
      "Late Fee": d.lateFee,
      "Oldest Due Date": formatDate(d.oldestDueDate),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Defaulters");
    XLSX.writeFile(wb, `defaulters-${pq.year || currentFY()}.xlsx`);
  };

  const columns = useMemo(
    () => [
      {
        key: "house",
        header: "House",
        render: (row: Defaulter) => (
          <div>
            <p className="font-medium text-slate-900">{row.houseNo}</p>
            {row.owner && <p className="text-xs text-slate-500">{row.owner}</p>}
          </div>
        ),
      },
      {
        key: "phone",
        header: "Phone",
        render: (row: Defaulter) => <span className="text-slate-700">{row.phone || "-"}</span>,
      },
      {
        key: "overdue",
        header: "Overdue",
        render: (row: Defaulter) => <span className="text-slate-700">{row.overduePeriods} periods</span>,
      },
      {
        key: "principal",
        header: "Principal",
        render: (row: Defaulter) => <span className="text-slate-700">{formatCurrency(row.principalPending)}</span>,
      },
      {
        key: "lateFee",
        header: "Late Fee",
        render: (row: Defaulter) =>
          row.lateFee > 0 ? <span className="text-red-600">{formatCurrency(row.lateFee)}</span> : <span className="text-slate-400">-</span>,
      },
      {
        key: "oldest",
        header: "Oldest Due",
        render: (row: Defaulter) => <span className="text-slate-700">{formatDate(row.oldestDueDate)}</span>,
      },
      {
        key: "actions",
        header: "",
        width: "130px",
        render: (row: Defaulter) => (
          <div className="flex justify-end">
            <a
              href={whatsappUrl(row)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              WhatsApp
            </a>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Defaulters"
        subtitle="Houses with overdue maintenance for the selected period"
        actions={
          <Button variant="secondary" leftIcon="download" onClick={handleExport} disabled={rows.length === 0}>
            Export Excel
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Defaulters" value={total} icon="alert" color="red" />
        <StatCard label="Principal Pending" value={formatCurrency(totals.principal)} icon="wallet" color="indigo" />
        <StatCard label="Late Fee" value={formatCurrency(totals.lateFee)} icon="clock" color="amber" />
        <StatCard label="Total Due" value={formatCurrency(totals.grand)} icon="receipt" color="purple" />
      </div>

      <Card className="mb-4">
        <PeriodSelector />
      </Card>

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(row) => row.houseId}
          loading={loading}
          emptyMessage="No defaulters for this year."
          emptyIcon="check"
          striped
          hoverable
        />
      )}
    </div>
  );
}