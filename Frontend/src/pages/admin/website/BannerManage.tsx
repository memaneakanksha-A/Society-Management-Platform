import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ImagePicker from "@/components/common/ImagePicker";
import { fileUrl } from "@/utils/constants";
import { getErrorMessage } from "@/api/axios";
import { getBanners, createBanner, updateBanner, deleteBanner } from "@/api/content.api";
import type { Banner } from "@/types/content.types";

export default function BannerManage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", order: "0", isActive: true });

  const [delTarget, setDelTarget] = useState<Banner | null>(null);

  const load = () => {
    setLoading(true);
    getBanners()
      .then(setBanners)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setFile(null);
    setForm({ title: "", subtitle: "", order: "0", isActive: true });
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setFile(null);
    setForm({
      title: b.title,
      subtitle: b.subtitle || "",
      order: String(b.order ?? 0),
      isActive: b.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing && !file) {
      toast.error("Image is required");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.subtitle) fd.append("subtitle", form.subtitle.trim());
      fd.append("order", form.order || "0");
      fd.append("isActive", String(form.isActive));
      if (file) fd.append("image", file);

      if (editing) await updateBanner(editing._id, fd);
      else await createBanner(fd);
      toast.success(editing ? "Banner updated" : "Banner created");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b: Banner) => {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!b.isActive));
      await updateBanner(b._id, fd);
      setBanners((list) =>
        list.map((x) => (x._id === b._id ? { ...x, isActive: !x.isActive } : x))
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setSaving(true);
    try {
      await deleteBanner(delTarget._id);
      toast.success("Banner deleted");
      setDelTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banners</h1>
        <button
          onClick={openAdd}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + Add Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No banners yet.
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b._id} className="flex items-center gap-4 rounded-lg bg-white p-4 shadow">
              <img src={fileUrl(b.image)} alt={b.title} className="h-16 w-24 rounded object-cover" />
              <div className="flex-1">
                <p className="font-medium">{b.title}</p>
                {b.subtitle && <p className="text-sm text-gray-500">{b.subtitle}</p>}
                <p className="text-xs text-gray-400">Order: {b.order}</p>
              </div>
              <button
                onClick={() => toggle(b)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  b.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {b.isActive ? "Active" : "Inactive"}
              </button>
              <button onClick={() => openEdit(b)} className="text-indigo-600 hover:underline text-sm">
                Edit
              </button>
              <button
                onClick={() => setDelTarget(b)}
                className="text-red-600 hover:underline text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? "Edit Banner" : "Add Banner"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !form.title.trim() || (!editing && !file)}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <ImagePicker value={editing?.image} onChange={setFile} label="Image" />
          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Subtitle</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                Active
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete Banner"
        message={`Delete "${delTarget?.title}"?`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}