import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getErrorMessage } from "@/api/axios";
import { getCollectionReport } from "@/api/maintenance.api";
import type { CollectionResponse } from "@/types/maintenance.types";
import PeriodSelector, { usePeriodQuery } from "@/components/reports/PeriodSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import Loader from "@/components/common/Loader";
import { formatCurrency } from "@/utils/formatCurrency";

const modeLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

export default function CollectionReport() {
  const pq = usePeriodQuery();
  const [data, setData] = useState<CollectionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCollectionReport(undefined, undefined, pq);
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pq.year, pq.period, pq.month, pq.quarter]);

  const byMode = useMemo(
    () =>
      Object.entries(data?.byMode || {}).map(([k, v]) => ({
        name: modeLabels[k] || k,
        value: v,
      })),
    [data]
  );

  const byType = useMemo(
    () =>
      Object.entries(data?.byType || {}).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v,
      })),
    [data]
  );

  const byDay = useMemo(
    () =>
      Object.entries(data?.byDay || {})
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => ({ date: k, value: v })),
    [data]
  );

  return (
    <div>
      <PageHeader title="Collection Report" subtitle={data?.period?.label || "Payments collected"} />

      <Card className="mb-5">
        <PeriodSelector />
      </Card>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Collected" value={formatCurrency(data?.total || 0)} icon="wallet" color="green" />
            <StatCard label="Payments" value={data?.count || 0} icon="creditCard" color="indigo" />
            <StatCard label="Modes" value={byMode.length} icon="pieChart" color="blue" />
            <StatCard label="Days" value={byDay.length} icon="calendar" color="purple" />
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byMode}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                    <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {data?.breakdown && data.breakdown.length > 0 && (
            <Card className="mb-5">
              <CardHeader>
                <CardTitle>Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-5 lg:grid-cols-2">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.breakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                      <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="pb-2">Period</th>
                          <th className="pb-2 text-right">Payments</th>
                          <th className="pb-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.breakdown.map((b) => (
                          <tr key={b.label} className="border-b">
                            <td className="py-2 text-slate-700">{b.label}</td>
                            <td className="py-2 text-right">{b.count || 0}</td>
                            <td className="py-2 text-right font-medium text-slate-900">{formatCurrency(b.total || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>By Day</CardTitle>
            </CardHeader>
            <CardContent>
              {byDay.length === 0 ? (
                <p className="text-sm text-slate-500">No collections in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2">Date</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDay.map((d) => (
                        <tr key={d.date} className="border-b">
                          <td className="py-2 text-slate-700">{d.date}</td>
                          <td className="py-2 text-right font-medium text-slate-900">{formatCurrency(d.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}