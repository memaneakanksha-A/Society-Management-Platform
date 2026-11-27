import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getMyComplaints,
  getMyComplaint,
  raiseComplaint,
  commentMyComplaint,
  openMyComplaintPhoto,
  getErrorMessage,
} from "@/api/member.api";
import type { Complaint, ComplaintListResponse } from "@/types/member.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable } from "@/components/ui/DataTable";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
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

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const priorityVariant = (p: string): "red" | "amber" | "gray" =>
  p === "high" ? "red" : p === "medium" ? "amber" : "gray";

const statusVariant = (s: string): "red" | "amber" | "green" | "gray" =>
  s === "open" ? "red" : s === "in_progress" ? "amber" : s === "resolved" ? "green" : "gray";

export default function Complaints() {
  const [data, setData] = useState<ComplaintListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ category: "other", priority: "medium", title: "", description: "" });
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Complaint | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setData(await getMyComplaints({ limit: 50 }));
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
    setForm({ category: "other", priority: "medium", title: "", description: "" });
    setPhotos([]);
    setAddOpen(true);
  };

  const onPick = (files: FileList | null) => {
    if (!files) return;
    setPhotos(Array.from(files).slice(0, 3));
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("category", form.category);
      fd.append("priority", form.priority);
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      photos.forEach((p) => fd.append("photos", p));
      await raiseComplaint(fd);
      toast.success("Complaint raised");
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (c: Complaint) => {
    setDetail(c);
    setNote("");
    try {
      setDetail(await getMyComplaint(c._id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const addComment = async () => {
    if (!detail || !note.trim()) return;
    setSaving(true);
    try {
      await commentMyComplaint(detail._id, note.trim());
      toast.success("Comment added");
      setNote("");
      setDetail(await getMyComplaint(detail._id));
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
            <p className="text-xs capitalize text-slate-500">{r.category}</p>
          </div>
        ),
      },
      { key: "title", header: "Title", render: (r: Complaint) => <span className="text-slate-700">{r.title}</span> },
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
            <Button size="sm" variant="secondary" onClick={() => openDetail(r)}>Track</Button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading && !data) return <Loader />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Complaints</h1>
          <p className="mt-1 text-sm text-slate-500">{data?.total || 0} complaints</p>
        </div>
        <Button leftIcon="plus" onClick={openAdd}>Raise complaint</Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.complaints || []}
        keyExtractor={(r) => r._id}
        loading={loading}
        emptyMessage="You have not raised any complaints yet."
        emptyIcon="alert"
        striped
        hoverable
      />

      <Modal
        open={addOpen}
        title="Raise a complaint"
        onClose={() => setAddOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={saving || !form.title.trim() || !form.description.trim()} leftIcon="save">
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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
              onChange={(e) => onPick(e.target.files)}
              className="text-sm"
            />
            {photos.length > 0 && <p className="mt-1 text-xs text-slate-500">{photos.length} selected</p>}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detail}
        title={detail ? `${detail.complaintNo} · ${detail.title}` : "Complaint"}
        onClose={() => setDetail(null)}
        wide
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={priorityVariant(detail.priority)}>{detail.priority} priority</Badge>
              <Badge variant={statusVariant(detail.status)}>{detail.status.replace("_", " ")}</Badge>
              <span className="text-xs text-slate-500">{formatDate(detail.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{detail.description}</p>

            {detail.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.photos.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => openMyComplaintPhoto(detail._id, p).catch((e) => toast.error(getErrorMessage(e)))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-indigo-600 hover:bg-slate-100"
                  >
                    View photo
                  </button>
                ))}
              </div>
            )}

            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Add comment</p>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add more details" />
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="secondary" loading={saving} disabled={saving || !note.trim()} onClick={addComment} leftIcon="plus">
                  Add comment
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Status timeline</p>
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
    </div>
  );
}