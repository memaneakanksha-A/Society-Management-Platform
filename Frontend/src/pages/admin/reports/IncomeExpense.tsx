import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getErrorMessage } from "@/api/axios";
import { getIncomeExpenseReport, updateOpeningBalance } from "@/api/expense.api";
import type { IncomeExpenseReport } from "@/types/finance.types";
import PeriodSelector, { usePeriodQuery } from "@/components/reports/PeriodSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import Loader from "@/components/common/Loader";
import { formatCurrency } from "@/utils/formatCurrency";

const currentFY = (): number => {
  const n = new Date();
  return n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
};

const PIE_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function IncomeExpense() {
  const pq = usePeriodQuery();
  const year = pq.year || currentFY();

  const [report, setReport] = useState<IncomeExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);

  const [openingCash, setOpeningCash] = useState("");
  const [openingBank, setOpeningBank] = useState("");
  const [savingOpening, setSavingOpening] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getIncomeExpenseReport({
        year,
        period: pq.period,
        month: pq.month,
        quarter: pq.quarter,
      });
      setReport(res);
      setOpeningCash(String(res.openingBalance.cash ?? 0));
      setOpeningBank(String(res.openingBalance.bank ?? 0));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pq.year, pq.period, pq.month, pq.quarter]);

  const handleSaveOpening = async () => {
    setSavingOpening(true);
    try {
      await updateOpeningBalance(year, {
        openingCash: Number(openingCash) || 0,
        openingBank: Number(openingBank) || 0,
      });
      toast.success("Opening balance saved");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingOpening(false);
    }
  };

  const chartData = useMemo(() => {
    if (report?.breakdown && report.breakdown.length > 0) {
      return report.breakdown.map((b) => ({
        name: b.label,
        income: b.income || 0,
        expense: b.expenses || 0,
      }));
    }
    return (report?.monthWise || []).map((m) => ({ name: m.label, income: m.income, expense: m.expense }));
  }, [report]);

  const categoryData = useMemo(
    () => (report?.expenses.byCategory || []).map((c) => ({ name: c.name, value: c.amount })),
    [report]
  );

  const handleExport = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      { Item: "Opening Balance", Amount: report.openingBalance.total },
      { Item: "Maintenance Collected", Amount: report.income.maintenance },
      { Item: "Shares Collected", Amount: report.income.shares },
      { Item: "Other Income", Amount: report.income.other },
      { Item: "Total Income", Amount: report.income.total },
      { Item: "Total Expense", Amount: report.expenses.total },
      { Item: "Surplus / Deficit", Amount: report.net },
      { Item: "Closing Balance", Amount: report.closingBalance },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");

    const periodLabel = report.period?.label || `FY ${report.year}-${report.year + 1}`;
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ Period: periodLabel }]),
      "Period"
    );

    const monthRows =
      report.breakdown && report.breakdown.length > 0
        ? report.breakdown.map((b) => ({
            Period: b.label,
            Opening: b.opening || 0,
            Income: b.income || 0,
            Expense: b.expenses || 0,
            Surplus: b.surplus || 0,
            Closing: b.closingBalance || 0,
          }))
        : report.monthWise.map((m) => ({ Month: m.label, Income: m.income, Expense: m.expense, Net: m.net }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthRows), "Breakdown");

    const catRows = report.expenses.byCategory.map((c) => ({ Category: c.name, Amount: c.amount }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catRows), "By Category");

    XLSX.writeFile(wb, `income-expense-${report.year}-${report.year + 1}.xlsx`);
  };

  if (loading && !report) return <Loader />;

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Income & Expense Report"
          subtitle={report?.period?.label || "Financial year summary"}
          actions={
            <>
              <Button variant="secondary" leftIcon="download" onClick={handleExport} disabled={!report}>
                Export Excel
              </Button>
              <Button leftIcon="file" onClick={() => window.print()} disabled={!report}>
                Print / Save PDF
              </Button>
            </>
          }
        />
      </div>

      <Card className="no-print mb-5">
        <PeriodSelector />
      </Card>

      <Card className="no-print mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Input label="Opening Cash (₹)" type="number" min={0} value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
          <Input label="Opening Bank (₹)" type="number" min={0} value={openingBank} onChange={(e) => setOpeningBank(e.target.value)} />
          <Button onClick={handleSaveOpening} loading={savingOpening} disabled={savingOpening} leftIcon="save">
            Save Opening
          </Button>
        </div>
      </Card>

      {report && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Income" value={formatCurrency(report.income.total)} icon="wallet" color="green" />
            <StatCard label="Total Expense" value={formatCurrency(report.expenses.total)} icon="receipt" color="red" />
            <StatCard
              label={report.net >= 0 ? "Surplus" : "Deficit"}
              value={formatCurrency(Math.abs(report.net))}
              icon={report.net >= 0 ? "trendingUp" : "trendingDown"}
              color={report.net >= 0 ? "green" : "red"}
            />
            <StatCard label="Closing Balance" value={formatCurrency(report.closingBalance)} icon="database" color="indigo" />
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expense by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No expenses in this year.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Month-wise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2">Month</th>
                        <th className="pb-2 text-right">Income</th>
                        <th className="pb-2 text-right">Expense</th>
                        <th className="pb-2 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.monthWise.map((m) => (
                        <tr key={m.label} className="border-b">
                          <td className="py-2 text-slate-700">{m.label}</td>
                          <td className="py-2 text-right text-green-600">{formatCurrency(m.income)}</td>
                          <td className="py-2 text-right text-red-600">{formatCurrency(m.expense)}</td>
                          <td className={`py-2 text-right font-medium ${m.net >= 0 ? "text-slate-900" : "text-red-600"}`}>
                            {formatCurrency(m.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="py-2">Total</td>
                        <td className="py-2 text-right">{formatCurrency(report.income.total)}</td>
                        <td className="py-2 text-right">{formatCurrency(report.expenses.total)}</td>
                        <td className="py-2 text-right">{formatCurrency(report.net)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Cash vs Bank</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cash income</span>
                      <span className="font-medium text-slate-900">{formatCurrency(report.cashBank.cash.income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cash expense</span>
                      <span className="font-medium text-slate-900">{formatCurrency(report.cashBank.cash.expense)}</span>
                    </div>
                    <div className="my-2 border-t" />
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank income</span>
                      <span className="font-medium text-slate-900">{formatCurrency(report.cashBank.bank.income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank expense</span>
                      <span className="font-medium text-slate-900">{formatCurrency(report.cashBank.bank.expense)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Balances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Opening (cash + bank)</span>
                      <span className="font-medium text-slate-900">{formatCurrency(report.openingBalance.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Net surplus/deficit</span>
                      <span className={`font-medium ${report.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(report.net)}
                      </span>
                    </div>
                    <div className="my-2 border-t" />
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">Closing balance</span>
                      <span className="font-semibold text-indigo-600">{formatCurrency(report.closingBalance)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Expense by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {report.expenses.byCategory.length === 0 ? (
                <p className="text-sm text-slate-500">No expenses in this year.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2">Category</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.expenses.byCategory.map((c) => (
                        <tr key={c.categoryId} className="border-b">
                          <td className="py-2 text-slate-700">{c.name}</td>
                          <td className="py-2 text-right font-medium text-slate-900">{formatCurrency(c.amount)}</td>
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