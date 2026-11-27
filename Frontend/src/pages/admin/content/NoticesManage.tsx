import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNoticePublish,
} from "@/api/content.api";
import type { Notice, NoticeCategory } from "@/types/content.types";
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

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "maintenance", label: "Maintenance" },
  { value: "water", label: "Water" },
  { value: "security", label: "Security" },
  { value: "legal", label: "Legal" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "members", label: "Members only" },
];

const categoryLabel = (c: NoticeCategory): string => CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? c;

export default function NoticesManage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [category, setCategory] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "general" as NoticeCategory,
    isImportant: false,
    publishOn: "",
    expiresOn: "",
    visibility: "public",
    isPublished: false,
  });

  const [delTarget, setDelTarget] = useState<Notice | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotices({
        search: debouncedSearch || undefined,
        category: category || undefined,
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
  }, [debouncedSearch, category, page]);

  const openAdd = () => {
    setEditing(null);
    setAttachment(null);
    setForm({
      title: "",
      body: "",
      category: "general",
      isImportant: false,
      publishOn: "",
      expiresOn: "",
      visibility: "public",
      isPublished: false,
    });
    setFormOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditing(n);
    setAttachment(null);
    setForm({
      title: n.title,
      body: n.body || "",
      category: n.category,
      isImportant: n.isImportant,
      publishOn: n.publishOn ? n.publishOn.split("T")[0] : "",
      expiresOn: n.expiresOn ? n.expiresOn.split("T")[0] : "",
      visibility: n.visibility,
      isPublished: n.isPublished,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.body.trim()) fd.append("body", form.body.trim());
      fd.append("category", form.category);
      fd.append("visibility", form.visibility);
      fd.append("isImportant", String(form.isImportant));
      fd.append("isPublished", String(form.isPublished));
      if (form.publishOn) fd.append("publishOn", form.publishOn);
      if (form.expiresOn) fd.append("expiresOn", form.expiresOn);
      if (attachment) fd.append("attachment", attachment);

      if (editing) await updateNotice(editing._id, fd);
      else await createNotice(fd);
      toast.success(editing ? "Notice updated" : "Notice created");
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (n: Notice) => {
    try {
      await toggleNoticePublish(n._id, !n.isPublished);
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, isPublished: !x.isPublished } : x)));
      toast.success(n.isPublished ? "Unpublished" : "Published");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setSaving(true);
    try {
      await deleteNotice(delTarget._id);
      toast.success("Notice deleted");
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
        render: (row: Notice) => (
          <div className="flex items-center gap-2">
            {row.isImportant && <span className="text-amber-500">●</span>}
            <div>
              <p className="font-medium text-slate-900">{row.title}</p>
              {row.body && <p className="line-clamp-1 text-xs text-slate-500">{row.body}</p>}
            </div>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        width: "130px",
        render: (row: Notice) => <span className="text-slate-700">{categoryLabel(row.category)}</span>,
      },
      {
        key: "publishOn",
        header: "Publish",
        width: "130px",
        render: (row: Notice) => <span className="text-slate-700">{row.publishOn ? formatDate(row.publishOn) : "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        width: "110px",
        render: (row: Notice) => (
          <Badge variant={row.isPublished ? "green" : "gray"}>{row.isPublished ? "Published" : "Draft"}</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "260px",
        render: (row: Notice) => (
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
        title="Notices"
        subtitle={`Showing ${items.length} of ${total} notices`}
        actions={<Button leftIcon="plus" onClick={openAdd}>Add Notice</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Search" placeholder="Title or body" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        <Select label="Category" placeholder="All" options={CATEGORY_OPTIONS} value={category} onChange={(e) => setCategory(e.target.value)} />
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
            emptyMessage="No notices yet. Add the first one."
            emptyIcon="bell"
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
        title={editing ? "Edit Notice" : "Add Notice"}
        onClose={() => setFormOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={saving || !form.title.trim()} leftIcon="save">Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category *" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as NoticeCategory }))} />
            <Select label="Visibility" options={VISIBILITY_OPTIONS} value={form.visibility} onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Publish On" type="date" value={form.publishOn} onChange={(e) => setForm((f) => ({ ...f, publishOn: e.target.value }))} />
            <Input label="Expires On" type="date" value={form.expiresOn} onChange={(e) => setForm((f) => ({ ...f, expiresOn: e.target.value }))} />
          </div>
          <Textarea label="Body" rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <FilePicker value={editing?.attachment} onChange={setAttachment} label="Attachment (PDF)" accept="pdf" />
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isImportant} onChange={(e) => setForm((f) => ({ ...f, isImportant: e.target.checked }))} className="h-4 w-4" />
              Important
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="h-4 w-4" />
              Published
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete Notice"
        message={`Delete "${delTarget?.title}"?`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}