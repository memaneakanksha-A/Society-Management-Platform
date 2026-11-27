import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getComplaints,
  getComplaint,
  updateComplaint,
  commentComplaint,
  createComplaintAdmin,
  openComplaintPhotoAdmin,
  getErrorMessage,
} from "@/api/member.api";
import { getHouses } from "@/api/house.api";
import type { Complaint, ComplaintListResponse } from "@/types/member.types";
import type { House } from "@/types/house.types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/utils/formatDate";

const CATEGORIES = [
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
  { value: "road", label: "Road" },
  { value: "lift", label: "Lift" },
  { value: "security", label: "Security" },
  { value: "parking", label: "Parking" },
  { value: "noise", label: "Noise" },
  { value: "neighbour", label: "Neighbour" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const priorityVariant = (p: string): "red" | "amber" | "gray" =>
  p === "high" ? "red" : p === "medium" ? "amber" : "gray";

const statusVariant = (s: string): "red" | "amber" | "green" | "gray" =>
  s === "open" ? "red" : s === "in_progress" ? "amber" : s === "resolved" ? "green" : "gray";

export default function ComplaintList() {
  const [data, setData] = useState<ComplaintListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");

  const [detail, setDetail] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [form, setForm] = useState({
    houseId: "",
    category: "other",
    priority: "medium",
    title: "",
    description: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category, priority]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getComplaints({
        search: debouncedSearch || undefined,
        status: status || undefined,
        category: category || undefined,
        priority: priority || undefined,
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
  }, [debouncedSearch, status, category, priority, page]);

  const openDetail = async (c: Complaint) => {
    setDetail(c);
    setNote("");
    setNewStatus(c.status);
    setAssignedTo(c.assignedTo || "");
    setNewPriority(c.priority);
    setDetailLoading(true);
    try {
      const fresh = await getComplaint(c._id);
      setDetail(fresh);
      setNewStatus(fresh.status);
      setAssignedTo(fresh.assignedTo || "");
      setNewPriority(fresh.priority);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetail = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await updateComplaint(detail._id, {
        status: newStatus,
        assignedTo: assignedTo.trim() || undefined,
        priority: newPriority,
        note: note.trim() || undefined,
      });
      toast.success("Complaint updated");
      await openDetail(detail);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!detail || !note.trim()) return;
    setSaving(true);
    try {
      await commentComplaint(detail._id, note.trim());
      toast.success("Comment added");
      setNote("");
      await openDetail(detail);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openAdd = async () => {
    setForm({ houseId: "", category: "other", priority: "medium", title: "", description: "" });
    setPhotos([]);
    setAddOpen(true);
    try {
      const res = await getHouses({ page: 1, limit: 200 } as any);
      setHouses(res.houses);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 3);
    setPhotos(arr);
  };

  const saveNew = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("houseId", form.houseId);
      fd.append("category", form.category);
      fd.append("priority", form.priority);
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      photos.forEach((p) => fd.append("photos", p));
      await createComplaintAdmin(fd);
      toast.success("Complaint created");
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "complaintNo",
        header: "Complaint",
        render: (r: Complaint) => (
          <div>
            <p className="font-medium text-slate-900">{r.complaintNo}</p>
            <p className="text-xs text-slate-500">House {r.houseNo || "-"}</p>
          </div>
        ),
      },
      {
        key: "title",
        header: "Title",
        render: (r: Complaint) => (
          <div>
            <p className="text-slate-900">{r.title}</p>
            <p className="text-xs capitalize text-slate-500">{r.category}</p>
          </div>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        width: "110px",
        render: (r: Complaint) => <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge>,
      },
      {
        key: "status",
        header: "Status",
        width: "130px",
        render: (r: Complaint) => <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>,
      },
      { key: "createdAt", header: "Created", width: "130px", render: (r: Complaint) => <span className="text-slate-700">{formatDate(r.createdAt)}</span> },
      {
        key: "actions",
        header: "",
        width: "120px",
        render: (r: Complaint) => (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => openDetail(r)}>View</Button>
          </div>
        ),
      },
    ],
    []
  );

  const stats = data?.stats || {};

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle={data ? `${data.total} complaints` : undefined}
        actions={<Button leftIcon="plus" onClick={openAdd}>Add complaint</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open" value={stats.open || 0} icon="alert" color="red" />
        <StatCard label="In Progress" value={stats.in_progress || 0} icon="clock" color="amber" />
        <StatCard label="Resolved" value={stats.resolved || 0} icon="check" color="green" />
        <StatCard label="Total" value={stats.total || 0} icon="list" color="indigo" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Search" placeholder="Complaint no, title or house" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        <Select label="Status" placeholder="All" options={STATUSES} value={status} onChange={(e) => setStatus(e.target.value)} />
        <Select label="Category" placeholder="All" options={CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Select label="Priority" placeholder="All" options={PRIORITIES} value={priority} onChange={(e) => setPriority(e.target.value)} />
      </div>

      {loading && !data ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.complaints || []}
            keyExtractor={(r) => r._id}
            loading={loading}
            emptyMessage="No complaints found."
            emptyIcon="alert"
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
        title={detail ? `${detail.complaintNo} · ${detail.title}` : "Complaint"}
        onClose={() => setDetail(null)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            <Button onClick={saveDetail} loading={saving} disabled={saving} leftIcon="save">Save changes</Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            {detailLoading && <Loader />}
            <div className="flex flex-wrap gap-2">
              <Badge variant={priorityVariant(detail.priority)}>{detail.priority} priority</Badge>
              <Badge variant={statusVariant(detail.status)}>{detail.status.replace("_", " ")}</Badge>
              <span className="text-xs text-slate-500">Raised by {detail.raisedByName} · {formatDate(detail.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{detail.description}</p>

            {detail.photos.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Photos</p>
                <div className="flex flex-wrap gap-2">
                  {detail.photos.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => openComplaintPhotoAdmin(detail._id, p).catch((e) => toast.error(getErrorMessage(e)))}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-indigo-600 hover:bg-slate-100"
                    >
                      View photo
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Status" options={STATUSES} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
              <Select label="Priority" options={PRIORITIES} value={newPriority} onChange={(e) => setNewPriority(e.target.value)} />
              <Input label="Assigned To" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Name or team" />
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Add comment / note</p>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a note for the timeline" />
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="secondary" loading={saving} disabled={saving || !note.trim()} onClick={addComment} leftIcon="plus">
                  Add comment
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Timeline</p>
              <ol className="space-y-2 border-l border-slate-200 pl-4">
                {detail.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <p className="text-sm text-slate-900">
                      <span className="font-medium capitalize">{h.status.replace("_", " ")}</span>
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

      <Modal
        open={addOpen}
        title="Add complaint"
        onClose={() => setAddOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveNew} loading={saving} disabled={saving || !form.houseId || !form.title.trim() || !form.description.trim()} leftIcon="save">
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="House *"
            placeholder="Select house"
            options={houses.map((h) => ({ value: h._id, label: h.houseNo }))}
            value={form.houseId}
            onChange={(e) => setForm((f) => ({ ...f, houseId: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" options={CATEGORIES} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <Select label="Priority" options={PRIORITIES} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
          </div>
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description *" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Photos (up to 3)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => onPickPhotos(e.target.files)}
              className="text-sm"
            />
            {photos.length > 0 && <p className="mt-1 text-xs text-slate-500">{photos.length} selected</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}