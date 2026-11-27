import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getNews,
  createNews,
  updateNews,
  deleteNews,
  toggleNewsPublish,
} from "@/api/content.api";
import type { News } from "@/types/content.types";
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

export default function NewsManage() {
  const [items, setItems] = useState<News[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [published, setPublished] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<News | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    body: "",
    date: todayStr(),
    isPublished: false,
    isPinned: false,
  });

  const [delTarget, setDelTarget] = useState<News | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, published]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNews({
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
    setForm({ title: "", summary: "", body: "", date: todayStr(), isPublished: false, isPinned: false });
    setFormOpen(true);
  };

  const openEdit = (n: News) => {
    setEditing(n);
    setFile(null);
    setForm({
      title: n.title,
      summary: n.summary || "",
      body: n.body || "",
      date: n.date ? n.date.split("T")[0] : todayStr(),
      isPublished: n.isPublished,
      isPinned: n.isPinned,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.summary.trim()) fd.append("summary", form.summary.trim());
      if (form.body.trim()) fd.append("body", form.body.trim());
      fd.append("date", form.date);
      fd.append("isPublished", String(form.isPublished));
      fd.append("isPinned", String(form.isPinned));
      if (file) fd.append("image", file);

      if (editing) await updateNews(editing._id, fd);
      else await createNews(fd);
      toast.success(editing ? "News updated" : "News created");
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (n: News) => {
    try {
      await toggleNewsPublish(n._id, !n.isPublished);
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
      await deleteNews(delTarget._id);
      toast.success("News deleted");
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
        render: (row: News) => (
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-slate-100">
              {row.image ? <img src={fileUrl(row.image)} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {row.title}
                {row.isPinned && <span className="ml-2 align-middle text-xs text-amber-600">Pinned</span>}
              </p>
              {row.summary && <p className="line-clamp-1 text-xs text-slate-500">{row.summary}</p>}
            </div>
          </div>
        ),
      },
      {
        key: "date",
        header: "Date",
        width: "130px",
        render: (row: News) => <span className="text-slate-700">{formatDate(row.date)}</span>,
      },
      {
        key: "status",
        header: "Status",
        width: "110px",
        render: (row: News) => (
          <Badge variant={row.isPublished ? "green" : "gray"}>{row.isPublished ? "Published" : "Draft"}</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "260px",
        render: (row: News) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => togglePublish(row)}>
              {row.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDelTarget(row)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="News"
        subtitle={`Showing ${items.length} of ${total} news`}
        actions={<Button leftIcon="plus" onClick={openAdd}>Add News</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Search" placeholder="Title or body" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
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
            emptyMessage="No news yet. Add the first one."
            emptyIcon="megaphone"
            striped
            hoverable
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} items</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-slate-600">Page {page} of {pages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit News" : "Add News"}
        onClose={() => setFormOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={saving || !form.title.trim()} leftIcon="save">
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ImagePicker value={editing?.image} onChange={setFile} label="Image" />
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Input label="Summary" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          <Textarea label="Body" rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="h-4 w-4" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))} className="h-4 w-4" />
              Pinned
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete News"
        message={`Delete "${delTarget?.title}"?`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}