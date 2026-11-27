import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getTopPayers } from "@/api/maintenance.api";
import type { TopPayer } from "@/types/maintenance.types";
import PeriodSelector, { usePeriodQuery } from "@/components/reports/PeriodSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import Loader from "@/components/common/Loader";

const currentFY = (): number => {
  const n = new Date();
  return n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
};

const podiumStyles = [
  { ring: "ring-2 ring-amber-400", badge: "bg-amber-100 text-amber-700", height: "h-40", label: "1st" },
  { ring: "ring-2 ring-slate-300", badge: "bg-slate-100 text-slate-700", height: "h-32", label: "2nd" },
  { ring: "ring-2 ring-orange-300", badge: "bg-orange-100 text-orange-700", height: "h-28", label: "3rd" },
];

export default function TopPayers() {
  const pq = usePeriodQuery();
  const [rows, setRows] = useState<TopPayer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTopPayers(pq.year || currentFY(), {
      period: pq.period,
      month: pq.month,
      quarter: pq.quarter,
    })
      .then((res) => {
        setRows(res.topPayers);
        setTotal(res.total);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pq.year, pq.period, pq.month, pq.quarter]);

  const podium = rows.slice(0, 3);

  const columns = useMemo(
    () => [
      {
        key: "rank",
        header: "Rank",
        width: "80px",
        render: (row: TopPayer) => <span className="font-semibold text-slate-900">#{row.rank}</span>,
      },
      {
        key: "house",
        header: "House",
        render: (row: TopPayer) => (
          <div>
            <p className="font-medium text-slate-900">{row.houseNo}</p>
            {row.owner && <p className="text-xs text-slate-500">{row.owner}</p>}
          </div>
        ),
      },
      {
        key: "score",
        header: "Score",
        render: (row: TopPayer) => <span className="font-semibold text-indigo-600">{row.score}</span>,
      },
      {
        key: "onTime",
        header: "On-time",
        render: (row: TopPayer) => <span className="text-green-600">{row.paidOnTimeCount}</span>,
      },
      {
        key: "advance",
        header: "Advance",
        render: (row: TopPayer) => <span className="text-blue-600">{row.advanceCount}</span>,
      },
      {
        key: "late",
        header: "Late",
        render: (row: TopPayer) => <span className="text-red-600">{row.lateCount}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="Top Payers" subtitle="Residents ranked by payment discipline for the selected period" />

      <Card className="mb-5">
        <PeriodSelector />
      </Card>

      {loading ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-500">No payments recorded for this year.</p>
        </Card>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            {podium.map((p, i) => {
              const style = podiumStyles[i];
              return (
                <div
                  key={p.houseId}
                  className={`flex flex-col items-center justify-end rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${style.ring}`}
                >
                  <span className={`mb-2 rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>{style.label} place</span>
                  <p className="text-lg font-semibold text-slate-900">{p.houseNo}</p>
                  {p.owner && <p className="text-sm text-slate-500">{p.owner}</p>}
                  <p className="mt-2 text-2xl font-bold text-indigo-600">{p.score}</p>
                  <p className="text-xs text-slate-400">points</p>
                </div>
              );
            })}
          </div>

          <Card className="mb-5">
            <CardHeader>
              <CardTitle>How scoring works</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <li>Advance payment: +3 points</li>
                <li>On-time payment: +2 points</li>
                <li>Late payment: +1 point</li>
                <li>Pending / overdue: 0 points</li>
              </ul>
            </CardContent>
          </Card>

          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(row) => row.houseId}
            loading={loading}
            emptyMessage="No top payers."
            emptyIcon="trendingUp"
            striped
            hoverable
          />
          <p className="mt-3 text-sm text-slate-500">{total} ranked residents</p>
        </>
      )}
    </div>
  );
}