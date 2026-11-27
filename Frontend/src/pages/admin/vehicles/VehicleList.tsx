import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from "@/api/tenant.api";
import { getHouses } from "@/api/house.api";
import type { Vehicle, VehicleType, VehicleFormData } from "@/types/tenant.types";
import type { House } from "@/types/house.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/icons";
import Loader from "@/components/common/Loader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import VehicleFormModal from "@/components/vehicle/VehicleFormModal";

const typeLabels: Record<VehicleType, string> = {
  two_wheeler: "Two Wheeler",
  four_wheeler: "Four Wheeler",
  cycle: "Cycle",
  other: "Other",
};

export default function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [housesLoading, setHousesLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "">("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHouses({ limit: 500 })
      .then((res) => setHouses(res.houses))
      .catch(() => setHouses([]))
      .finally(() => setHousesLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  const reload = async () => {
    const res = await getVehicles({ search: search || undefined, type: typeFilter || undefined, page, limit: 20 });
    setVehicles(res.vehicles);
    setTotal(res.total);
    setPages(res.pages);
  };

  useEffect(() => {
    setLoading(true);
    reload().catch((err) => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  }, [search, typeFilter, page]);

  const openAdd = () => {
    setEditingVehicle(null);
    setFormOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormOpen(true);
  };

  const handleSave = async (form: VehicleFormData) => {
    setSaving(true);
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle._id, form);
        toast.success("Vehicle updated");
      } else {
        await createVehicle(form);
        toast.success("Vehicle created");
      }
      setFormOpen(false);
      setEditingVehicle(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVehicle) return;
    setSaving(true);
    try {
      await deleteVehicle(deletingVehicle._id);
      toast.success("Vehicle deleted");
      setDeleteOpen(false);
      setDeletingVehicle(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "house",
        header: "House No",
        render: (row: Vehicle) => (
          <span className="font-medium text-slate-900">{row.house?.houseNo || "-"}</span>
        ),
      },
      {
        key: "vehicleNo",
        header: "Vehicle No",
        render: (row: Vehicle) => <span className="font-medium text-slate-900">{row.vehicleNo}</span>,
      },
      {
        key: "type",
        header: "Type",
        render: (row: Vehicle) => (
          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {typeLabels[row.type] || row.type}
          </span>
        ),
      },
      {
        key: "make",
        header: "Make / Model",
        render: (row: Vehicle) => (
          <div>
            <p className="text-slate-700">{row.make || "-"}</p>
            {row.vehicleModel && <p className="text-xs text-slate-500">{row.vehicleModel}</p>}
          </div>
        ),
      },
      {
        key: "colour",
        header: "Colour",
        render: (row: Vehicle) => <span className="text-slate-700">{row.colour || "-"}</span>,
      },
      {
        key: "owner",
        header: "Owner",
        render: (row: Vehicle) => (
          <div className="text-sm">
            <p className="font-medium text-slate-900">{row.ownerType === "owner" ? "Owner" : "Tenant"}</p>
            <p className="text-xs text-slate-500">{row.ownerRefId}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: Vehicle) => (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "80px",
        render: (row: Vehicle) => (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => openEdit(row)}
              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
              aria-label="Edit"
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              onClick={() => {
                setDeletingVehicle(row);
                setDeleteOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Delete"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading && vehicles.length === 0) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={`Showing ${vehicles.length} of ${total} vehicles`}
        actions={
          <Button variant="primary" leftIcon="plus" onClick={openAdd}>
            Add Vehicle
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Search"
            placeholder="Search vehicle no, make, model"
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
              { value: "two_wheeler", label: "Two Wheeler" },
              { value: "four_wheeler", label: "Four Wheeler" },
              { value: "cycle", label: "Cycle" },
              { value: "other", label: "Other" },
            ]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as VehicleType | "")}
            className="w-48"
          />
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={vehicles}
        keyExtractor={(row) => row._id}
        loading={loading}
        emptyMessage="No vehicles found."
        emptyIcon="car"
        emptyAction={
          <Button variant="primary" leftIcon="plus" onClick={openAdd}>
            Add Vehicle
          </Button>
        }
        striped
        hoverable
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} vehicles</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-slate-600">
            Page {page} of {pages}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
            Next
          </Button>
        </div>
      </div>

      <VehicleFormModal
        open={formOpen}
        mode={editingVehicle ? "edit" : "create"}
        initial={editingVehicle}
        houses={houses}
        housesLoading={housesLoading}
        loading={saving}
        onClose={() => {
          setFormOpen(false);
          setEditingVehicle(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Vehicle"
        message={`Delete vehicle ${deletingVehicle?.vehicleNo}? This cannot be undone.`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setDeletingVehicle(null);
        }}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}