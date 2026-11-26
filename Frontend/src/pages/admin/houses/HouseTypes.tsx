import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { getErrorMessage } from "@/api/axios";
import {
  getHouseTypes,
  createHouseType,
  updateHouseType,
  deleteHouseType,
} from "@/api/house.api";
import type { HouseType, HouseTypeCategory } from "@/types/house.types";

const categories: HouseTypeCategory[] = ["bungalow", "flat", "rk", "other"];

const emptyForm = {
  code: "",
  name: "",
  category: "bungalow" as HouseTypeCategory,
  defaultMaintenanceAmount: "0",
};

export default function HouseTypes() {
  const [types, setTypes] = useState<HouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HouseType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<HouseType | null>(null);

  const load = () => {
    setLoading(true);
    getHouseTypes()
      .then(setTypes)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (t: HouseType) => {
    setEditing(t);
    setForm({
      code: t.code,
      name: t.name,
      category: t.category,
      defaultMaintenanceAmount: String(t.defaultMaintenanceAmount ?? 0),
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category,
        defaultMaintenanceAmount: Number(form.defaultMaintenanceAmount) || 0,
      };
      if (editing) {
        await updateHouseType(editing._id, payload);
        toast.success("House type updated");
      } else {
        await createHouseType(payload);
        toast.success("House type created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteHouseType(deleteTarget._id);
      toast.success("House type deleted");
      setDeleteTarget(null);
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
        <h1 className="text-2xl font-semibold">House Types</h1>
        <button
          onClick={openAdd}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + Add House Type
        </button>
      </div>

      {types.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No house types yet. Add your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Default Maintenance</th>
                <th className="px-4 py-3">Houses</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t._id} className="border-t">
                  <td className="px-4 py-3 font-medium">{t.code}</td>
                  <td className="px-4 py-3">{t.name}</td>
                  <td className="px-4 py-3 capitalize">{t.category}</td>
                  <td className="px-4 py-3">{t.defaultMaintenanceAmount}</td>
                  <td className="px-4 py-3">{t.houseCount ?? 0}</td>
                  <td className="space-x-3 px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit House Type" : "Add House Type"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !form.code.trim() || !form.name.trim()}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full rounded border px-3 py-2 uppercase outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as HouseTypeCategory })
                }
                className="w-full rounded border px-3 py-2 capitalize outline-none focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Default Maintenance</label>
              <input
                type="number"
                value={form.defaultMaintenanceAmount}
                onChange={(e) => setForm({ ...form, defaultMaintenanceAmount: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete House Type"
        message={`Delete ${deleteTarget?.code} - ${deleteTarget?.name}?`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}