import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/api/axios";
import {
  getHouses,
  getHouseStats,
  getHouseTypes,
  createHouse,
  updateHouse,
  bulkDeleteHouses,
  bulkChangeHouseType,
} from "@/api/house.api";
import type {
  House,
  HouseStats,
  HouseType,
  OccupancyStatus,
  MaintenancePayableBy,
  BulkDeleteResult,
} from "@/types/house.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Pagination from "@/components/common/Pagination";
import OccupancyBadge from "@/components/house/OccupancyBadge";
import { Icon } from "@/components/ui/icons";
import Badge from "@/components/common/Badge";

const emptyStats: HouseStats = {
  total: 0,
  ownerLiving: 0,
  rented: 0,
  vacant: 0,
  withoutOwner: 0,
  byType: [],
};

const occupancyOptions = [
  { value: "owner_living", label: "Owner living" },
  { value: "rented", label: "Rented" },
  { value: "vacant", label: "Vacant" },
] as const;

const maintenanceOptions = [
  { value: "owner", label: "Owner" },
  { value: "tenant", label: "Tenant" },
] as const;

export default function HouseList() {
  const navigate = useNavigate();

  const [houses, setHouses] = useState<House[]>([]);
  const [stats, setStats] = useState<HouseStats>(emptyStats);
  const [types, setTypes] = useState<HouseType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [typeId, setTypeId] = useState("");
  const [occupancy, setOccupancy] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    houseTypeId: "",
    houseNo: "",
    area: "",
    location: "",
    occupancyStatus: "owner_living" as OccupancyStatus,
    maintenancePayableBy: "owner" as MaintenancePayableBy,
    notes: "",
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [editForm, setEditForm] = useState({
    houseTypeId: "",
    houseNo: "",
    area: "",
    location: "",
    occupancyStatus: "owner_living" as OccupancyStatus,
    maintenancePayableBy: "owner" as MaintenancePayableBy,
    notes: "",
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkChangeTypeLoading, setBulkChangeTypeLoading] = useState(false);
  const [bulkChangeToTypeId, setBulkChangeToTypeId] = useState("");

  useEffect(() => {
    getHouseTypes()
      .then(setTypes)
      .catch(() => setTypes([]));
    getHouseStats()
      .then(setStats)
      .catch(() => setStats(emptyStats));
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, typeId, occupancy]);

  useEffect(() => {
    setLoading(true);
    getHouses({ search: debouncedSearch || undefined, typeId: typeId || undefined, occupancy: occupancy || undefined, page, limit: 20 })
      .then((res) => {
        setHouses(res.houses);
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [debouncedSearch, typeId, occupancy, page]);

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const saveHouse = async () => {
    setSaving(true);
    try {
      await createHouse({
        houseTypeId: form.houseTypeId,
        houseNo: form.houseNo,
        area: form.area !== "" ? Number(form.area) : undefined,
        location: form.location || undefined,
        occupancyStatus: form.occupancyStatus,
        maintenancePayableBy: form.maintenancePayableBy,
        notes: form.notes || undefined,
      });
      toast.success("House created");
      setAddOpen(false);
      setForm({
        houseTypeId: "",
        houseNo: "",
        area: "",
        location: "",
        occupancyStatus: "owner_living",
        maintenancePayableBy: "owner",
        notes: "",
      });
      setPage(1);
      getHouses({ search: debouncedSearch || undefined, typeId: typeId || undefined, occupancy: occupancy || undefined, page: 1, limit: 20 })
        .then((res) => {
          setHouses(res.houses);
          setTotal(res.total);
          setPages(res.pages);
        });
      getHouseStats().then(setStats);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (house: House) => {
    setEditingHouse(house);
    setEditForm({
      houseTypeId: typeof house.houseTypeId === "object" ? house.houseTypeId._id : (house.houseTypeId as string),
      houseNo: house.houseNo,
      area: house.area?.toString() ?? "",
      location: house.location ?? "",
      occupancyStatus: house.occupancyStatus,
      maintenancePayableBy: house.maintenancePayableBy,
      notes: house.notes ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingHouse) return;
    setSaving(true);
    try {
      await updateHouse(editingHouse._id, {
        houseTypeId: editForm.houseTypeId,
        houseNo: editForm.houseNo,
        area: editForm.area !== "" ? Number(editForm.area) : undefined,
        location: editForm.location || undefined,
        occupancyStatus: editForm.occupancyStatus,
        maintenancePayableBy: editForm.maintenancePayableBy,
        notes: editForm.notes || undefined,
      });
      toast.success("House updated");
      setEditOpen(false);
      setEditingHouse(null);
      getHouses({ search: debouncedSearch || undefined, typeId: typeId || undefined, occupancy: occupancy || undefined, page, limit: 20 })
        .then((res) => setHouses(res.houses));
      getHouseStats().then(setStats);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmOpen(false);
    setBulkDeleteLoading(true);
    try {
      const res: BulkDeleteResult = await bulkDeleteHouses({ ids: selectedIds });
      let msg = `Deleted ${res.deleted}`;
      if (res.blocked.length > 0) {
        msg += `, blocked ${res.blocked.length} (${res.blocked.map((b) => `${b.houseNo}: ${b.reason}`).join(", ")})`;
      }
      toast.success(msg);
      setSelectedIds([]);
      getHouses({ search: debouncedSearch || undefined, typeId: typeId || undefined, occupancy: occupancy || undefined, page, limit: 20 })
        .then((res) => setHouses(res.houses));
      getHouseStats().then(setStats);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleBulkChangeType = async () => {
    if (selectedIds.length === 0 || !bulkChangeToTypeId) return;
    setBulkChangeTypeLoading(true);
    try {
      const res = await bulkChangeHouseType({ ids: selectedIds, toTypeId: bulkChangeToTypeId });
      toast.success(`Updated ${res.updated} houses`);
      setSelectedIds([]);
      setBulkChangeToTypeId("");
      getHouses({ search: debouncedSearch || undefined, typeId: typeId || undefined, occupancy: occupancy || undefined, page, limit: 20 })
        .then((res) => setHouses(res.houses));
      getHouseStats().then(setStats);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBulkChangeTypeLoading(false);
    }
  };

  const ownerOf = (h: House) =>
    h.currentOwnerId && typeof h.currentOwnerId === "object" ? h.currentOwnerId : null;
  const typeOf = (h: House) =>
    h.houseTypeId && typeof h.houseTypeId === "object" ? h.houseTypeId : null;

  const columns = useMemo(() => [
    {
      key: "select",
      header: "",
      width: "48px",
      render: (row: House) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row._id)}
          onChange={(e) => handleSelectOne(row._id, e.target.checked)}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
      ),
    },
    {
      key: "houseNo",
      header: "House No",
      render: (row: House) => (
        <span className="font-medium text-slate-900">{row.houseNo}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row: House) => {
        const type = typeOf(row);
        return type ? (
          <span className="text-slate-700">{type.code} - {type.name}</span>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: "area",
      header: "Area",
      render: (row: House) => (
        <span className="text-slate-700">{row.area ? `${row.area} sq ft` : "-"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (row: House) => (
        <span className="text-slate-700">{row.location || "-"}</span>
      ),
    },
    {
      key: "owner",
      header: "Current Owner",
      render: (row: House) => {
        const owner = ownerOf(row);
        return owner ? (
          <div>
            <p className="font-medium text-slate-900">{owner.name}</p>
            {owner.phone && <p className="text-xs text-slate-400">{owner.phone}</p>}
          </div>
        ) : (
          <span className="text-slate-400">Unassigned</span>
        );
      },
    },
    {
      key: "occupancy",
      header: "Occupancy",
      render: (row: House) => (
        <OccupancyBadge status={row.occupancyStatus} />
      ),
    },
    {
      key: "maintenance",
      header: "Maintenance By",
      render: (row: House) => (
        <Badge variant={row.maintenancePayableBy === "owner" ? "blue" : "amber"}>
          {row.maintenancePayableBy}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      render: (row: House) => (
        <button
          onClick={() => openEdit(row)}
          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
          aria-label={`Edit ${row.houseNo}`}
        >
          <Icon name="edit" size={16} />
        </button>
      ),
    },
  ], [selectedIds, types]);

  if (loading && houses.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Houses"
        subtitle={`Showing ${houses.length} of ${total} houses`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon="download" onClick={() => navigate("/admin/houses/bulk")}>
              Bulk Create
            </Button>
            <Button variant="primary" leftIcon="plus" onClick={() => setAddOpen(true)}>
              Add House
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon="home" color="indigo" />
        <StatCard label="Owner Living" value={stats.ownerLiving} icon="user" color="green" />
        <StatCard label="Rented" value={stats.rented} icon="key" color="blue" />
        <StatCard label="Vacant" value={stats.vacant} icon="home" color="amber" />
        <StatCard label="Without Owner" value={stats.withoutOwner} icon="alert" color="red" />
      </div>

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Search"
            placeholder="Search house no or owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon="search"
            className="flex-1 max-w-xs"
          />
          <Select
            label="Type"
            placeholder="All types"
            options={[
              { value: "", label: "All types" },
              ...types.map((t) => ({ value: t._id, label: `${t.code} - ${t.name}` })),
            ]}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="w-48"
          />
          <Select
            label="Occupancy"
            placeholder="All occupancy"
            options={[
              { value: "", label: "All occupancy" },
              ...occupancyOptions.map((o) => ({ value: o.value, label: o.label })),
            ]}
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value as any)}
            className="w-40"
          />
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={houses}
        keyExtractor={(row) => row._id}
        loading={loading}
        emptyMessage="No houses found."
        emptyIcon="home"
        emptyAction={
          <Button variant="primary" leftIcon="plus" onClick={() => setAddOpen(true)}>
            Add House
          </Button>
        }
        onRowClick={(row) => navigate(`/admin/houses/${row._id}`)}
        striped
        hoverable
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} houses</p>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg p-4 md:p-6">
          <div className="mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-700">
              {selectedIds.length} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                placeholder="Change type to…"
                options={[
                  { value: "", label: "Change type to…" },
                  ...types.map((t) => ({ value: t._id, label: `${t.code} - ${t.name}` })),
                ]}
                value={bulkChangeToTypeId}
                onChange={(e) => setBulkChangeToTypeId(e.target.value)}
                className="min-w-[200px]"
                disabled={bulkChangeTypeLoading}
              />
              <Button
                variant="secondary"
                leftIcon="edit"
                onClick={handleBulkChangeType}
                disabled={bulkChangeTypeLoading || !bulkChangeToTypeId}
                loading={bulkChangeTypeLoading}
              >
                Change Type
              </Button>
              <Button
                variant="danger"
                leftIcon="trash"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={bulkDeleteLoading}
                loading={bulkDeleteLoading}
              >
                Delete
              </Button>
              <Button variant="ghost" onClick={() => { setSelectedIds([]); }}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Selected Houses"
        message={`Delete ${selectedIds.length} house${selectedIds.length !== 1 ? "s" : ""}? Houses with owners or tenants will be skipped.`}
        loading={bulkDeleteLoading}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        confirmText="Delete"
      />

      <Modal
        open={addOpen}
        title="Add House"
        onClose={() => setAddOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveHouse} loading={saving} disabled={!form.houseTypeId || !form.houseNo.trim()}>
              {saving ? "Saving..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">House Type *</label>
              <select
                value={form.houseTypeId}
                onChange={(e) => setForm({ ...form, houseTypeId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select type</option>
                {types.map((t) => (
                  <option key={t._id} value={t._id}>{t.code} - {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">House No *</label>
              <input
                value={form.houseNo}
                onChange={(e) => setForm({ ...form, houseNo: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Area (sq ft)</label>
              <input
                type="number"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Occupancy</label>
              <select
                value={form.occupancyStatus}
                onChange={(e) => setForm({ ...form, occupancyStatus: e.target.value as OccupancyStatus })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {occupancyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Maintenance Payable By</label>
              <select
                value={form.maintenancePayableBy}
                onChange={(e) => setForm({ ...form, maintenancePayableBy: e.target.value as MaintenancePayableBy })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {maintenanceOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        title="Edit House"
        onClose={() => { setEditOpen(false); setEditingHouse(null); }}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditOpen(false); setEditingHouse(null); }}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit} loading={saving} disabled={!editForm.houseTypeId || !editForm.houseNo.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">House Type *</label>
              <select
                value={editForm.houseTypeId}
                onChange={(e) => setEditForm({ ...editForm, houseTypeId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select type</option>
                {types.map((t) => (
                  <option key={t._id} value={t._id}>{t.code} - {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">House No *</label>
              <input
                value={editForm.houseNo}
                onChange={(e) => setEditForm({ ...editForm, houseNo: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Area (sq ft)</label>
              <input
                type="number"
                value={editForm.area}
                onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
              <input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Occupancy</label>
              <select
                value={editForm.occupancyStatus}
                onChange={(e) => setEditForm({ ...editForm, occupancyStatus: e.target.value as OccupancyStatus })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {occupancyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Maintenance Payable By</label>
              <select
                value={editForm.maintenancePayableBy}
                onChange={(e) => setEditForm({ ...editForm, maintenancePayableBy: e.target.value as MaintenancePayableBy })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {maintenanceOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}