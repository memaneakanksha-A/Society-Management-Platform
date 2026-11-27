import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getHouseTypes,
  createHouseType,
  updateHouseType,
  deleteHouseType,
  bulkChangeHouseType,
} from "@/api/house.api";
import type { HouseType, HouseTypeCategory } from "@/types/house.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Icon } from "@/components/ui/icons";
import Badge from "@/components/common/Badge";
const categories: HouseTypeCategory[] = ["bungalow", "flat", "rk", "other"];

const emptyForm = {
  code: "",
  name: "",
  category: "bungalow" as HouseTypeCategory,
  defaultMaintenanceAmount: "0",
};

export default function HouseTypes() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<HouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HouseType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<HouseType | null>(null);
  const [moveTarget, setMoveTarget] = useState<HouseType | null>(null);
  const [moveToTypeId, setMoveToTypeId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);

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
    setFormError("");
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
    setFormError("");
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError("");
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
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("E11000")) {
        setFormError("This code is already used by another house type. Please choose a different code.");
      } else {
        toast.error(msg);
      }
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
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (t: HouseType) => {
    setDeleteTarget(t);
  };

  const openMoveModal = (t: HouseType) => {
    setMoveTarget(t);
    setMoveToTypeId("");
  };

  const confirmMove = async () => {
    if (!moveTarget || !moveToTypeId) return;
    setMoveLoading(true);
    try {
      await bulkChangeHouseType({ toTypeId: moveToTypeId, fromTypeId: moveTarget._id });
      toast.success(`Moved houses from ${moveTarget.code} to the selected type`);
      setMoveTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMoveLoading(false);
    }
  };

  const viewHouses = (typeId: string) => {
    navigate(`/admin/houses?typeId=${typeId}`);
  };

  const columns = useMemo(() => [
    {
      key: "code",
      header: "Code",
      render: (row: HouseType) => (
        <span className="font-medium text-slate-900">{row.code}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (row: HouseType) => (
        <span className="text-slate-700">{row.name}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row: HouseType) => (
        <Badge variant="gray">{row.category}</Badge>
      ),
    },
    {
      key: "defaultMaintenanceAmount",
      header: "Default Maintenance",
      render: (row: HouseType) => (
        <span className="text-slate-700">₹{row.defaultMaintenanceAmount.toLocaleString("en-IN")}</span>
      ),
    },
    {
      key: "houseCount",
      header: "Houses",
      render: (row: HouseType) => (
        <span className="font-medium text-slate-900">{row.houseCount ?? 0}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "200px",
      render: (row: HouseType) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openEdit(row)}
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
            aria-label={`Edit ${row.code}`}
          >
            <Icon name="edit" size={16} />
          </button>
          {row.houseCount && row.houseCount > 0 ? (
            <>
              <button
                onClick={() => viewHouses(row._id)}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                aria-label={`View houses for ${row.code}`}
              >
                <Icon name="externalLink" size={16} />
              </button>
              <button
                onClick={() => openMoveModal(row)}
                className="text-slate-400 hover:text-amber-600 transition-colors p-1"
                aria-label={`Move houses from ${row.code}`}
              >
                <Icon name="userPlus" size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => openDeleteConfirm(row)}
              className="text-slate-400 hover:text-red-600 transition-colors p-1"
              aria-label={`Delete ${row.code}`}
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="House Types"
        subtitle={`Managing ${types.length} house types`}
        actions={
          <Button variant="primary" leftIcon="plus" onClick={openAdd}>
            Add House Type
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={types}
        keyExtractor={(row) => row._id}
        loading={loading}
        emptyMessage="No house types yet. Add your first one."
        emptyIcon="building"
        emptyAction={
          <Button variant="primary" leftIcon="plus" onClick={openAdd}>
            Add House Type
          </Button>
        }
        striped
        hoverable
      />

      <Modal
        open={modalOpen}
        title={editing ? "Edit House Type" : "Add House Type"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving} disabled={!form.code.trim() || !form.name.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code *"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. A, B, FLAT"
              maxLength={10}
            />
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Bungalow Type A"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              options={categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as HouseTypeCategory })}
            />
            <Input
              label="Default Maintenance"
              type="number"
              value={form.defaultMaintenanceAmount}
              onChange={(e) => setForm({ ...form, defaultMaintenanceAmount: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete House Type"
        message={
          deleteTarget
            ? `${deleteTarget.houseCount} house${deleteTarget.houseCount !== 1 ? "s" : ""} use "${deleteTarget.code} - ${deleteTarget.name}". Delete or move them first.`
            : "Are you sure?"
        }
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
      />

      <Modal
        open={!!moveTarget}
        title="Move Houses to Another Type"
        onClose={() => setMoveTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button variant="secondary" leftIcon="userPlus" onClick={confirmMove} loading={moveLoading} disabled={moveLoading || !moveToTypeId}>
              Move
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          Move all {moveTarget?.houseCount} house{moveTarget?.houseCount !== 1 ? "s" : ""} from{" "}
          <strong>{moveTarget?.code} - {moveTarget?.name}</strong> to:
        </p>
        <select
          value={moveToTypeId}
          onChange={(e) => setMoveToTypeId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select target type</option>
          {types
            .filter((t) => t._id !== moveTarget?._id)
            .map((t) => (
              <option key={t._id} value={t._id}>
                {t.code} - {t.name} ({t.houseCount ?? 0} houses)
              </option>
            ))}
        </select>
      </Modal>
    </div>
  );
}