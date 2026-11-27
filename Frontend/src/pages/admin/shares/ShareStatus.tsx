import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getShares, updateShare, bulkInitShares } from "@/api/maintenance.api";
import { getHouses } from "@/api/house.api";
import type { ShareRecord, ShareStatus } from "@/types/maintenance.types";
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

const statusColors: Record<ShareStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};

export default function ShareStatus() {
  const navigate = useNavigate();
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [stats, setStats] = useState({ totalAmount: 0, paid: 0, pending: 0, counts: { total: 0, paid: 0, pending: 0, partial: 0 } });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [editTarget, setEditTarget] = useState<ShareRecord | null>(null);
  const [editForm, setEditForm] = useState({ totalAmount: "", certificateNo: "", issueDate: "" });
  const [saving, setSaving] = useState(false);

  const [initOpen, setInitOpen] = useState(false);
  const [initAmount, setInitAmount] = useState("");
  const [initCount, setInitCount] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(false);

  const reload = async () => {
    const res = await getShares({ status: status || undefined, search: search || undefined, page, limit: 20 });
    setShares(res.shares);
    setStats(res.stats);
    setTotal(res.total);
    setPages(res.pages);
  };

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  useEffect(() => {
    setLoading(true);
    reload().catch((err) => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  }, [status, search, page]);

  const openEdit = (s: ShareRecord) => {
    setEditTarget(s);
    setEditForm({
      totalAmount: String(s.totalAmount),
      certificateNo: s.certificateNo || "",
      issueDate: s.issueDate ? s.issueDate.split("T")[0] : "",
    });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateShare(String(editTarget.houseId), {
        totalAmount: Number(editForm.totalAmount) || 0,
        certificateNo: editForm.certificateNo || undefined,
        issueDate: editForm.issueDate || undefined,
      });
      toast.success("Share updated");
      setEditTarget(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleInit = async () => {
    setInitializing(true);
    try {
      const res = await bulkInitShares(Number(initAmount) || 0);
      toast.success(`Initialized ${res.created} share records`);
      setInitOpen(false);
      setInitAmount("");
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInitializing(false);
    }
  };

  const openInit = async () => {
    setInitAmount("");
    setInitCount(null);
    setInitOpen(true);
    try {
      const res = await getHouses({ limit: 1 } as any);
      setInitCount(Math.max(0, (res.total || 0) - stats.counts.total));
    } catch {
      setInitCount(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "house",
        header: "House",
        render: (row: ShareRecord) => (
          <div>
            <p className="font-medium text-slate-900">{row.houseNo || "-"}</p>
            {row.houseTypeCode && <p className="text-xs text-slate-500">{row.houseTypeCode}</p>}
          </div>
        ),
      },
      {
        key: "owner",
        header: "Owner",
        render: (row: ShareRecord) => (
          <div>
            <p className="text-slate-700">{row.ownerName || "-"}</p>
            {row.ownerPhone && <p className="text-xs text-slate-500">{row.ownerPhone}</p>}
          </div>
        ),
      },
      { key: "total", header: "Share amount", render: (row: ShareRecord) => <span>{formatCurrency(row.totalAmount)}</span> },
      { key: "paid", header: "Paid", render: (row: ShareRecord) => <span className="text-green-600">{formatCurrency(row.paidAmount)}</span> },
      {
        key: "pending",
        header: "Pending",
        render: (row: ShareRecord) => (
          <span className="font-medium text-slate-900">
            {formatCurrency(row.pendingAmount ?? row.totalAmount - row.paidAmount)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: ShareRecord) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status]}`}>{row.status}</span>
        ),
      },
      {
        key: "certificate",
        header: "Certificate",
        render: (row: ShareRecord) => (
          <div>
            <p className="text-slate-700">{row.certificateNo || "-"}</p>
            {row.issueDate && <p className="text-xs text-slate-500">{formatDate(row.issueDate)}</p>}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "210px",
        render: (row: ShareRecord) => {
          const pending = row.pendingAmount ?? row.totalAmount - row.paidAmount;
          const houseId = typeof row.houseId === "object" ? row.houseId?._id : row.houseId;
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                onClick={() => navigate(`/admin/payments/new?kind=share&houseId=${houseId}`)}
                disabled={pending <= 0}
              >
                Record
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                Edit certificate
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  return (
    <div>
      <PageHeader
        title="Shares"
        subtitle={`Showing ${shares.length} of ${total} share records`}
        actions={
          <Button leftIcon="plus" onClick={openInit}>
            Initialize shares for all houses
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Shares" value={formatCurrency(stats.totalAmount)} icon="database" color="indigo" />
        <StatCard label="Collected" value={formatCurrency(stats.paid)} icon="check" color="green" />
        <StatCard label="Pending" value={formatCurrency(stats.pending)} icon="clock" color="amber" />
        <StatCard label="Records" value={stats.counts.total} icon="users" color="blue" subtext={`${stats.counts.paid} paid · ${stats.counts.partial} partial`} />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Status"
            placeholder="All"
            options={[
              { value: "", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "partial", label: "Partial" },
              { value: "paid", label: "Paid" },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Input label="Search" placeholder="House no or owner name" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        </div>
      </Card>

      {loading && shares.length === 0 ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={shares}
            keyExtractor={(row) => row._id}
            loading={loading}
            emptyMessage="No share records. Initialize shares for all houses."
            emptyIcon="database"
            striped
            hoverable
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} records</p>
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
        open={!!editTarget}
        title="Edit Share"
        onClose={() => setEditTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} loading={saving} disabled={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Total Amount (₹)" type="number" min={0} value={editForm.totalAmount} onChange={(e) => setEditForm((f) => ({ ...f, totalAmount: e.target.value }))} />
          <Input label="Certificate No" value={editForm.certificateNo} onChange={(e) => setEditForm((f) => ({ ...f, certificateNo: e.target.value }))} />
          <Input label="Issue Date" type="date" value={editForm.issueDate} onChange={(e) => setEditForm((f) => ({ ...f, issueDate: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={initOpen}
        title="Initialize Shares"
        onClose={() => setInitOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInit} loading={initializing} disabled={initializing || !initAmount}>
              Initialize
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Create share records for all houses that don't already have one
          {initCount !== null ? ` (${initCount} house${initCount === 1 ? "" : "s"} will get a record)` : ""}.
        </p>
        <Input label="Amount per house (₹)" type="number" min={0} value={initAmount} onChange={(e) => setInitAmount(e.target.value)} />
      </Modal>
    </div>
  );
}