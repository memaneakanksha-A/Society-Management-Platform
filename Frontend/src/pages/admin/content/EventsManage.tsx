import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventPublish,
} from "@/api/content.api";
import type { EventItem } from "@/types/content.types";
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
import ImagePicker from "@/components/common/ImagePicker";
import { fileUrl } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";

const todayStr = (): string => new Date().toISOString().split("T")[0];

export default function EventsManage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [published, setPublished] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: todayStr(),
    endDate: "",
    time: "",
    venue: "",
    isPublished: false,
  });

  const [delTarget, setDelTarget] = useState<EventItem | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, published]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getEvents({
        search: debouncedSearch || undefined,
        published: published || undefined,
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
  }, [debouncedSearch, published, page]);

  const openAdd = () => {
    setEditing(null);
    setFile(null);
    setForm({ title: "", description: "", date: todayStr(), endDate: "", time: "", venue: "", isPublished: false });
    setFormOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditing(e);
    setFile(null);
    setForm({
      title: e.title,
      description: e.description || "",
      date: e.date ? e.date.split("T")[0] : todayStr(),
      endDate: e.endDate ? e.endDate.split("T")[0] : "",
      time: e.time || "",
      venue: e.venue || "",
      isPublished: e.isPublished,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());
      fd.append("date", form.date);
      if (form.endDate) fd.append("endDate", form.endDate);
      if (form.time.trim()) fd.append("time", form.time.trim());
      if (form.venue.trim()) fd.append("venue", form.venue.trim());
      fd.append("isPublished", String(form.isPublished));
      if (file) fd.append("image", file);

      if (editing) await updateEvent(editing._id, fd);
      else await createEvent(fd);
      toast.success(editing ? "Event updated" : "Event created");
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (e: EventItem) => {
    try {
      await toggleEventPublish(e._id, !e.isPublished);
      setItems((list) => list.map((x) => (x._id === e._id ? { ...x, isPublished: !x.isPublished } : x)));
      toast.success(e.isPublished ? "Unpublished" : "Published");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setSaving(true);
    try {
      await deleteEvent(delTarget._id);
      toast.success("Event deleted");
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
        render: (row: EventItem) => (
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-slate-100">
              {row.image ? <img src={fileUrl(row.image)} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <p className="font-medium text-slate-900">{row.title}</p>
              <p className="text-xs text-slate-500">
                {[row.time, row.venue].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "date",
        header: "Date",
        width: "150px",
        render: (row: EventItem) => (
          <span className="text-slate-700">
            {formatDate(row.date)}
            {row.endDate ? ` – ${formatDate(row.endDate)}` : ""}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "110px",
        render: (row: EventItem) => (
          <Badge variant={row.isPublished ? "green" : "gray"}>{row.isPublished ? "Published" : "Draft"}</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "260px",
        render: (row: EventItem) => (
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
        title="Events"
        subtitle={`Showing ${items.length} of ${total} events`}
        actions={<Button leftIcon="plus" onClick={openAdd}>Add Event</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Search" placeholder="Title or venue" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        <Select
          label="Status"
          placeholder="All"
          options={[
            { value: "", label: "All" },
            { value: "true", label: "Published" },
            { value: "false", label: "Draft" },
          ]}
          value={published}
          onChange={(e) => setPublished(e.target.value)}
        />
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
            emptyMessage="No events yet. Add the first one."
            emptyIcon="calendar"
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
        title={editing ? "Edit Event" : "Add Event"}
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
          <ImagePicker value={editing?.image} onChange={setFile} label="Image" />
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start Date *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Time" placeholder="e.g., 6:00 PM" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            <Input label="Venue" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} />
          </div>
          <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="h-4 w-4" />
            Published
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete Event"
        message={`Delete "${delTarget?.title}"?`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}