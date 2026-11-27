import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getMyServiceRequests,
  requestService,
  openMyServiceDocument,
  getErrorMessage,
} from "@/api/member.api";
import type { ServiceRequest, ServiceRequestListResponse } from "@/types/member.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable } from "@/components/ui/DataTable";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import { formatDate } from "@/utils/formatDate";

const TYPES = [
  { value: "noc", label: "NOC" },
  { value: "address_proof", label: "Address Proof" },
  { value: "share_certificate", label: "Share Certificate" },
  { value: "no_dues_certificate", label: "No Dues Certificate" },
  { value: "other", label: "Other" },
];

const typeLabel = (t: string): string => TYPES.find((o) => o.value === t)?.label || t;

const statusVariant = (s: string): "amber" | "green" | "red" | "indigo" =>
  s === "pending" ? "amber" : s === "approved" ? "indigo" : s === "issued" ? "green" : "red";

export default function ServiceRequests() {
  const [data, setData] = useState<ServiceRequestListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ type: "noc", purpose: "", details: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await getMyServiceRequests({ limit: 50 }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm({ type: "noc", purpose: "", details: "" });
    setAddOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await requestService({
        type: form.type,
        purpose: form.purpose.trim(),
        details: form.details.trim() || undefined,
      });
      toast.success("Request submitted");
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const download = async (id: string) => {
    setBusyId(id);
    try {
      await openMyServiceDocument(id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "requestNo",
        header: "Request",
        render: (r: ServiceRequest) => <span className="font-medium text-slate-900">{r.requestNo}</span>,
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
        width: "150px",
        render: (r: ServiceRequest) => (
          <div className="flex justify-end">
            {r.status === "issued" ? (
              <Button size="sm" variant="secondary" loading={busyId === r._id} disabled={busyId === r._id} onClick={() => download(r._id)} leftIcon="download">
                Download
              </Button>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
        ),
      },
    ],
    [busyId]
  );

  if (loading && !data) return <Loader />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Service Requests</h1>
          <p className="mt-1 text-sm text-slate-500">{data?.total || 0} requests</p>
        </div>
        <Button leftIcon="plus" onClick={openAdd}>New request</Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.requests || []}
        keyExtractor={(r) => r._id}
        loading={loading}
        emptyMessage="You have not made any service requests yet."
        emptyIcon="file"
        striped
        hoverable
      />

      <Modal
        open={addOpen}
        title="New service request"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={saving || !form.purpose.trim()} leftIcon="save">
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Request Type *" options={TYPES} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <Input label="Purpose *" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="e.g., Bank loan application" />
          <Textarea label="Details" rows={3} value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}