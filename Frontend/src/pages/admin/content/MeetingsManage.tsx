import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  toggleMeetingPublish,
} from "@/api/content.api";
import type { Meeting, MeetingType, MeetingStatus } from "@/types/content.types";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable } from "@/components/ui/DataTable";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Badge from "@/components/common/Badge";
import FilePicker from "@/components/common/FilePicker";
import { formatDate } from "@/utils/formatDate";

const todayStr = (): string => new Date().toISOString().split("T")[0];

const TYPE_OPTIONS = [
  { value: "general_body", label: "General Body" },
  { value: "committee", label: "Committee" },
  { value: "agm", label: "AGM" },
  { value: "special", label: "Special" },
];

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const typeLabel = (t: MeetingType): string => TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

export default function MeetingsManage() {
  const [items, setItems] = useState<Meeting[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "general_body" as MeetingType,
    date: todayStr(),
    time: "",
    venue: "",
    agenda: "",
    minutes: "",
    attendeesCount: "0",
    status: "upcoming" as MeetingStatus,
    isPublished: false,
  });

  const [delTarget, setDelTarget] = useState<Meeting | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMeetings({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        limit: 20,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch, status, page]);

  const openAdd = () => {
    setEditing(null);
    setMinutesFile(null);
    setForm({
      title: "",
      type: "general_body",
      date: todayStr(),
      time: "",
      venue: "",
      agenda: "",
      minutes: "",
      attendeesCount: "0",
      status: "upcoming",
      isPublished: false,
    });
    setFormOpen(true);
  };

  const openEdit = (m: Meeting) => {
    setEditing(m);
    setMinutesFile(null);
    setForm({
      title: m.title,
      type: m.type,
      date: m.date ? m.date.split("T")[0] : todayStr(),
      time: m.time || "",
      venue: m.venue || "",
      agenda: m.agenda || "",
      minutes: m.minutes || "",
      attendeesCount: String(m.attendeesCount ?? 0),
      status: m.status,
      isPublished: m.isPublished,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("type", form.type);
      fd.append("date", form.date);
      if (form.time.trim()) fd.append("time", form.time.trim());
      if (form.venue.trim()) fd.append("venue", form.venue.trim());
      if (form.agenda.trim()) fd.append("agenda", form.agenda.trim());
      if (form.minutes.trim()) fd.append("minutes", form.minutes.trim());
      fd.append("attendeesCount", form.attendeesCount || "0");
      fd.append("status", form.status);
      fd.append("isPublished", String(form.isPublished));
      if (minutesFile) fd.append("minutesFile", minutesFile);

      if (editing) await updateMeeting(editing._id, fd);
      else await createMeeting(fd);
      toast.success(editing ? "Meeting updated" : "Meeting created");
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (m: Meeting) => {
    try {
      await toggleMeetingPublish(m._id, !m.isPublished);
      setItems((list) => list.map((x) => (x._id === m._id ? { ...x, isPublished: !x.isPublished } : x)));
      toast.success(m.isPublished ? "Unpublished" : "Published");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setSaving(true);
    try {
      await deleteMeeting(delTarget._id);
      toast.success("Meeting deleted");
      setDelTarget(null);
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
        key: "title",
        header: "Title",
        render: (row: Meeting) => (
          <div>
            <p className="font-medium text-slate-900">{row.title}</p>
            <p className="text-xs text-slate-500">{typeLabel(row.type)}</p>
          </div>
        ),
      },
      {
        key: "date",
        header: "Date",
        width: "150px",
        render: (row: Meeting) => (
          <div className="text-slate-700">
            <span>{formatDate(row.date)}</span>
            {row.time && <span className="block text-xs text-slate-500">{row.time}</span>}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "120px",
        render: (row: Meeting) => (
          <Badge
            variant={row.status === "upcoming" ? "blue" : row.status === "completed" ? "green" : "red"}
          >
            {row.status}
          </Badge>
        ),
      },
      {
        key: "published",
        header: "Published",
        width: "110px",
        render: (row: Meeting) => (
          <Badge variant={row.isPublished ? "green" : "gray"}>{row.isPublished ? "Yes" : "Draft"}</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "260px",
        render: (row: Meeting) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => togglePublish(row)}>
              {row.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDelTarget(row)}>Delete</Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Meetings"
        subtitle={`Showing ${items.length} of ${total} meetings`}
        actions={<Button leftIcon="plus" onClick={openAdd}>Add Meeting</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Search" placeholder="Title, agenda or venue" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        <Select label="Status" placeholder="All" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
      </div>

      {loading && items.length === 0 ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            keyExtractor={(row) => row._id}
            loading={loading}
            emptyMessage="No meetings yet. Add the first one."
            emptyIcon="users"
            striped
            hoverable
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} items</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="flex items-center px-3 text-sm text-slate-600">Page {page} of {pages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit Meeting" : "Add Meeting"}
        onClose={() => setFormOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={saving || !form.title.trim() || !form.date} leftIcon="save">Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Type *" options={TYPE_OPTIONS} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MeetingType }))} />
            <Select label="Status *" options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MeetingStatus }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Time" placeholder="e.g., 7:00 PM" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Venue" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} />
            <Input label="Attendees Count" type="number" min={0} value={form.attendeesCount} onChange={(e) => setForm((f) => ({ ...f, attendeesCount: e.target.value }))} />
          </div>
          <Textarea label="Agenda" rows={3} value={form.agenda} onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))} />
          <Textarea label="Minutes" rows={4} value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))} />
          <FilePicker value={editing?.minutesFile} onChange={setMinutesFile} label="Minutes Attachment (PDF)" accept="pdf" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="h-4 w-4" />
            Published
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete Meeting"
        message={`Delete "${delTarget?.title}"?`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}