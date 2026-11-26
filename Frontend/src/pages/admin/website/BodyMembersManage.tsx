import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ImagePicker from "@/components/common/ImagePicker";
import { fileUrl } from "@/utils/constants";
import { getErrorMessage } from "@/api/axios";
import {
  getBodyMembers,
  createBodyMember,
  updateBodyMember,
  deleteBodyMember,
} from "@/api/content.api";
import type { BodyMember } from "@/types/content.types";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function BodyMembersManage() {
  const [members, setMembers] = useState<BodyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMember | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
    order: "0",
    isActive: true,
  });

  const [delTarget, setDelTarget] = useState<BodyMember | null>(null);

  const load = () => {
    setLoading(true);
    getBodyMembers()
      .then(setMembers)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setFile(null);
    setForm({ name: "", designation: "", phone: "", email: "", order: "0", isActive: true });
    setOpen(true);
  };

  const openEdit = (m: BodyMember) => {
    setEditing(m);
    setFile(null);
    setForm({
      name: m.name,
      designation: m.designation,
      phone: m.phone || "",
      email: m.email || "",
      order: String(m.order ?? 0),
      isActive: m.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("designation", form.designation.trim());
      if (form.phone) fd.append("phone", form.phone.trim());
      if (form.email) fd.append("email", form.email.trim());
      fd.append("order", form.order || "0");
      fd.append("isActive", String(form.isActive));
      if (file) fd.append("photo", file);

      if (editing) await updateBodyMember(editing._id, fd);
      else await createBodyMember(fd);
      toast.success(editing ? "Member updated" : "Member created");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setSaving(true);
    try {
      await deleteBodyMember(delTarget._id);
      toast.success("Member deleted");
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
        <h1 className="text-2xl font-semibold">Body Members</h1>
        <button
          onClick={openAdd}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No members yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m) => {
            const photo = fileUrl(m.photo);
            return (
              <div key={m._id} className="flex flex-col items-center rounded-lg bg-white p-4 text-center shadow">
                {photo ? (
                  <img src={photo} alt={m.name} className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700">
                    {initials(m.name)}
                  </span>
                )}
                <p className="mt-3 font-medium text-gray-900">{m.name}</p>
                <p className="text-sm text-gray-500">{m.designation}</p>
                {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                {!m.isActive && (
                  <span className="mt-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    Inactive
                  </span>
                )}
                <div className="mt-2 flex gap-3 text-sm">
                  <button onClick={() => openEdit(m)} className="text-indigo-600 hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => setDelTarget(m)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? "Edit Member" : "Add Member"}
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
              disabled={saving || !form.name.trim() || !form.designation.trim()}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <ImagePicker value={editing?.photo} onChange={setFile} label="Photo" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Designation *</label>
              <input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
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
        title="Delete Member"
        message={`Delete "${delTarget?.name}"?`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}