import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getHouseTypes } from "@/api/house.api";
import { getDues, waiveLateFee } from "@/api/maintenance.api";
import type { EnrichedDue, DueStatus } from "@/types/maintenance.types";
import type { HouseType } from "@/types/house.types";
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
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

const statusColors: Record<DueStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentFY = (): number => {
  const n = new Date();
  return n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
};

// Calendar month (1-12) -> calendar year within a financial year starting April.
const calYearFor = (calendarMonth: number, fy: number): number =>
  calendarMonth < 4 ? fy + 1 : fy;

const defaultMonthFor = (fy: number): string => (fy === currentFY() ? "current" : "all");

export default function DuesList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const fyNow = currentFY();
  const currentCalendarMonth = new Date().getMonth() + 1;
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => fyNow - 1 + i), [fyNow]);

  const initialYear = Number(params.get("year")) || fyNow;

  const [types, setTypes] = useState<HouseType[]>([]);
  const [dues, setDues] = useState<EnrichedDue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalBilled: 0, collected: 0, pending: 0, lateFee: 0 });

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(params.get("month") || defaultMonthFor(initialYear));
  const [status, setStatus] = useState(params.get("status") || "");
  const [typeId, setTypeId] = useState(params.get("type") || "");
  const [search, setSearch] = useState(params.get("search") || "");
  const debouncedSearch = useDebounce(search, 400);

  const [waiveTarget, setWaiveTarget] = useState<EnrichedDue | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHouseTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  // Keep filters in the URL.
  useEffect(() => {
    const p: Record<string, string> = { year: String(year), month };
    if (status) p.status = status;
    if (typeId) p.type = typeId;
    if (search) p.search = search;
    if (page > 1) p.page = String(page);
    setParams(p, { replace: true });
  }, [year, month, status, typeId, search, page, setParams]);

  useEffect(() => {
    setPage(1);
  }, [year, month, status, typeId, debouncedSearch]);

  const monthRequest = useMemo<{ month: number | "all"; scope?: "overdue" }>(() => {
    if (month === "overdue") return { month: "all", scope: "overdue" };
    if (month === "all") return { month: "all" };
    if (month === "current") return { month: currentCalendarMonth };
    return { month: Number(month) };
  }, [month, currentCalendarMonth]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDues({
        year,
        status: status || undefined,
        typeId: typeId || undefined,
        search: debouncedSearch || undefined,
        month: monthRequest.month,
        scope: monthRequest.scope,
        page,
        limit: 20,
      });
      setDues(res.dues);
      setTotal(res.total);
      setPages(res.pages);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [year, status, typeId, debouncedSearch, month, page]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (year === fyNow) {
      opts.push({
        value: "current",
        label: `Current month (${MONTH_NAMES[currentCalendarMonth - 1]} ${year})`,
      });
    }
    opts.push({ value: "all", label: "All months" });
    for (let p = 1; p <= 12; p++) {
      const calMonth = ((p - 1 + 3) % 12) + 1; // Apr=4 ... Mar=3
      const calYear = calYearFor(calMonth, year);
      opts.push({ value: String(calMonth), label: `${MONTH_NAMES[calMonth - 1]} ${calYear}` });
    }
    opts.push({ value: "overdue", label: "Overdue (earlier months)" });
    return opts;
  }, [year, fyNow, currentCalendarMonth]);

  const periodHeading =
    month === "all"
      ? "All months"
      : month === "overdue"
      ? "Overdue (earlier months)"
      : month === "current"
      ? `${MONTH_NAMES[currentCalendarMonth - 1]} ${year}`
      : `${MONTH_NAMES[Number(month) - 1]} ${calYearFor(Number(month), year)}`;

  const changeYear = (y: number) => {
    setYear(y);
    setMonth(defaultMonthFor(y));
    setPage(1);
  };

  const reset = () => {
    setYear(fyNow);
    setMonth(defaultMonthFor(fyNow));
    setStatus("");
    setTypeId("");
    setSearch("");
    setPage(1);
  };

  const handleWaive = async () => {
    if (!waiveTarget) return;
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSaving(true);
    try {
      await waiveLateFee(waiveTarget.due._id, reason.trim());
      toast.success("Late fee waived");
      setWaiveTarget(null);
      setReason("");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "house",
        header: "House",
        render: (row: EnrichedDue) => (
          <div>
            <p className="font-medium text-slate-900">{row.houseNo}</p>
            {row.ownerName && <p className="text-xs text-slate-500">{row.ownerName}</p>}
          </div>
        ),
      },
      {
        key: "period",
        header: "Period",
        render: (row: EnrichedDue) => (
          <div>
            <p className="text-slate-700">{row.due.periodLabel}</p>
            <p className="text-xs text-slate-500">Due {formatDate(row.due.dueDate)}</p>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        render: (row: EnrichedDue) => <span className="text-slate-700">{formatCurrency(row.due.amount)}</span>,
      },
      {
        key: "paid",
        header: "Paid",
        render: (row: EnrichedDue) => <span className="text-green-600">{formatCurrency(row.due.paidPrincipal)}</span>,
      },
      {
        key: "outstanding",
        header: "Outstanding",
        render: (row: EnrichedDue) => (
          <span className="font-medium text-slate-900">{formatCurrency(row.outstanding)}</span>
        ),
      },
      {
        key: "lateFee",
        header: "Late Fee",
        render: (row: EnrichedDue) =>
          row.lateFee > 0 ? <span className="text-red-600">{formatCurrency(row.lateFee)}</span> : <span className="text-slate-400">-</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (row: EnrichedDue) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.due.status]}`}>
            {row.due.status}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "170px",
        render: (row: EnrichedDue) => (
          <div className="flex items-center justify-end gap-2">
            {row.due.status !== "paid" && row.due.status !== "cancelled" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const houseId =
                    typeof row.due.houseId === "object" ? row.due.houseId?._id : row.due.houseId;
                  navigate(`/admin/payments/new?houseId=${houseId}&dueId=${row.due._id}`);
                }}
              >
                Record
              </Button>
            )}
            {row.lateFee > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setWaiveTarget(row);
                  setReason("");
                }}
              >
                Waive
              </Button>
            )}
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div>
      <PageHeader
        title="Maintenance Dues"
        subtitle={`Showing ${dues.length} of ${total} dues`}
        actions={
          <Button onClick={() => navigate("/admin/payments/new")} leftIcon="plus">
            Record Payment
          </Button>
        }
      />

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">{periodHeading}</h2>
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Billed" value={formatCurrency(summary.totalBilled)} icon="wallet" color="indigo" />
        <StatCard label="Collected" value={formatCurrency(summary.collected)} icon="check" color="green" />
        <StatCard label="Pending" value={formatCurrency(summary.pending)} icon="clock" color="amber" />
        <StatCard label="Late Fee" value={formatCurrency(summary.lateFee)} icon="alert" color="red" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Year"
            options={years.map((y) => ({ value: String(y), label: `${y}-${String((y + 1) % 100).padStart(2, "0")}` }))}
            value={String(year)}
            onChange={(e) => changeYear(Number(e.target.value))}
          />
          <Select
            label="Month"
            options={monthOptions}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            options={[
              { value: "", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "partial", label: "Partial" },
              { value: "paid", label: "Paid" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Select
            label="House Type"
            placeholder="All types"
            options={[{ value: "", label: "All types" }, ...types.map((t) => ({ value: t._id, label: `${t.code} · ${t.name}` }))]}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          />
          <Input
            label="Search"
            placeholder="House or owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon="search"
          />
        </div>
      </Card>

      {loading && dues.length === 0 ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={dues}
            keyExtractor={(row) => row.due._id}
            loading={loading}
            emptyMessage="No dues found. Generate dues from Maintenance Setup."
            emptyIcon="wallet"
            striped
            hoverable
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} dues</p>
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
        open={!!waiveTarget}
        title="Waive Late Fee"
        onClose={() => setWaiveTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setWaiveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleWaive} loading={saving} disabled={saving || !reason.trim()}>
              Waive
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Waive late fee of{" "}
          <span className="font-medium text-slate-900">{formatCurrency(waiveTarget?.lateFee || 0)}</span> for house{" "}
          {waiveTarget?.houseNo}?
        </p>
        <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Paid at office" />
      </Modal>
    </div>
  );
}