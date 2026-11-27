import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getServiceRequests,
  getServiceRequest,
  updateServiceRequest,
  issueServiceRequest,
  openServiceDocumentAdmin,
  getErrorMessage,
} from "@/api/member.api";
import type { ServiceRequest, ServiceRequestListResponse } from "@/types/member.types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/utils/formatDate";

const TYPES = [
  { value: "noc", label: "NOC" },
  { value: "address_proof", label: "Address Proof" },
  { value: "share_certificate", label: "Share Certificate" },
  { value: "no_dues_certificate", label: "No Dues Certificate" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "issued", label: "Issued" },
];

const typeLabel = (t: string): string => TYPES.find((o) => o.value === t)?.label || t;

const statusVariant = (s: string): "amber" | "green" | "red" | "indigo" =>
  s === "pending" ? "amber" : s === "approved" ? "indigo" : s === "issued" ? "green" : "red";

export default function ServiceRequestList() {
  const [data, setData] = useState<ServiceRequestListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("pending");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, type]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getServiceRequests({
        search: debouncedSearch || undefined,
        status: status || undefined,
        type: type || undefined,
        page,
        limit: 20,
      });
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch, status, type, page]);

  const openDetail = async (r: ServiceRequest) => {
    setDetail(r);
    setNewStatus(r.status === "issued" ? "approved" : r.status);
    setRemarks(r.adminRemarks || "");
    setDetailLoading(true);
    try {
      const fresh = await getServiceRequest(r._id);
      setDetail(fresh);
      setNewStatus(fresh.status === "issued" ? "approved" : fresh.status);
      setRemarks(fresh.adminRemarks || "");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const save = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await updateServiceRequest(detail._id, { status: newStatus, adminRemarks: remarks.trim() || undefined });
      toast.success("Request updated");
      await openDetail(detail);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const issue = async (r: ServiceRequest) => {
    setIssuing(true);
    try {
      await issueServiceRequest(r._id);
      toast.success("Certificate issued");
      await openServiceDocumentAdmin(r._id);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIssuing(false);
    }
  };

  const viewDocument = async (id: string) => {
    try {
      await openServiceDocumentAdmin(id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "requestNo",
        header: "Request",
        render: (r: ServiceRequest) => (
          <div>
            <p className="font-medium text-slate-900">{r.requestNo}</p>
            <p className="text-xs text-slate-500">House {r.houseNo || "-"}</p>
          </div>
        ),
      },
      { key: "type", header: "Type", width: "170px", render: (r: ServiceRequest) => <span className="text-slate-700">{typeLabel(r.type)}</span> },
      { key: "purpose", header: "Purpose", render: (r: ServiceRequest) => <span className="text-slate-700">{r.purpose}</span> },
      {
        key: "status",
        header: "Status",
        width: "120px",
        render: (r: ServiceRequest) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      { key: "createdAt", header: "Created", width: "130px", render: (r: ServiceRequest) => <span className="text-slate-700">{formatDate(r.createdAt)}</span> },
      {
        key: "actions",
        header: "",
        width: "220px",
        render: (r: ServiceRequest) => (
          <div className="flex items-center justify-end gap-1.5">
            {r.status === "issued" && (
              <Button size="sm" variant="secondary" onClick={() => viewDocument(r._id)} leftIcon="download">PDF</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => openDetail(r)}>Review</Button>
          </div>
        ),
      },
    ],
    []
  );

  const stats = data?.stats || {};

  return (
    <div>
      <PageHeader title="Service Requests" subtitle={data ? `${data.total} requests` : undefined} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={stats.pending || 0} icon="clock" color="amber" />
        <StatCard label="Approved" value={stats.approved || 0} icon="check" color="indigo" />
        <StatCard label="Issued" value={stats.issued || 0} icon="file" color="green" />
        <StatCard label="Total" value={stats.total || 0} icon="list" color="blue" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Search" placeholder="Request no, purpose or house" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        <Select label="Status" placeholder="All" options={STATUSES} value={status} onChange={(e) => setStatus(e.target.value)} />
        <Select label="Type" placeholder="All" options={TYPES} value={type} onChange={(e) => setType(e.target.value)} />
      </div>

      {loading && !data ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.requests || []}
            keyExtractor={(r) => r._id}
            loading={loading}
            emptyMessage="No service requests found."
            emptyIcon="file"
            striped
            hoverable
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{data?.total || 0} items</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="flex items-center px-3 text-sm text-slate-600">Page {page} of {data?.pages || 1}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(data?.pages || 1, p + 1))} disabled={page === (data?.pages || 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!detail}
        title={detail ? `${detail.requestNo} · ${typeLabel(detail.type)}` : "Service Request"}
        onClose={() => setDetail(null)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            {detail && detail.status !== "issued" && (
              <Button leftIcon="file" loading={issuing} disabled={issuing || saving} onClick={() => issue(detail)}>
                Issue certificate
              </Button>
            )}
            <Button onClick={save} loading={saving} disabled={saving || issuing} leftIcon="save">Save</Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            {detailLoading && <Loader />}
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
              <span className="text-xs text-slate-500">House {detail.houseNo || "-"} · {formatDate(detail.createdAt)}</span>
            </div>
            <div className="text-sm text-slate-700">
              <p><span className="font-medium">Requested by:</span> {detail.requestedBy}</p>
              <p><span className="font-medium">Purpose:</span> {detail.purpose}</p>
              {detail.details && <p><span className="font-medium">Details:</span> {detail.details}</p>}
              {detail.issuedAt && <p><span className="font-medium">Issued on:</span> {formatDate(detail.issuedAt)}</p>}
            </div>

            {detail.status !== "issued" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Status" options={STATUSES.filter((s) => s.value !== "issued")} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
                <Input label="Admin Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks shown to member" />
              </div>
            )}

            {detail.status === "issued" && (
              <Button variant="secondary" leftIcon="download" onClick={() => viewDocument(detail._id)}>
                Download issued PDF
              </Button>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Timeline</p>
              <ol className="space-y-2 border-l border-slate-200 pl-4">
                {detail.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <p className="text-sm text-slate-900">
                      <span className="font-medium capitalize">{h.status}</span>
                      {h.note ? ` — ${h.note}` : ""}
                    </p>
                    <p className="text-xs text-slate-400">{h.byName} · {formatDate(h.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}