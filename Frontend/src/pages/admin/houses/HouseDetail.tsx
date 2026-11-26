import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import OccupancyBadge from "@/components/house/OccupancyBadge";
import OwnerFormModal from "@/components/house/OwnerFormModal";
import TransferOwnershipModal from "@/components/house/TransferOwnershipModal";
import { formatDate } from "@/utils/formatDate";
import { getErrorMessage } from "@/api/axios";
import {
  getHouse,
  updateHouse,
  deleteHouse,
  assignOwner,
  updateOwner,
  transferOwner,
} from "@/api/house.api";
import type {
  House,
  Owner,
  OccupancyStatus,
  MaintenancePayableBy,
  OwnerPayload,
  TransferPayload,
} from "@/types/house.types";

const comingSoon = ["Tenant", "Vehicles", "Maintenance", "Share", "Documents"];

export default function HouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [house, setHouse] = useState<House | null>(null);
  const [history, setHistory] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"owner" | string>("owner");

  const [assignOpen, setAssignOpen] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editHouseOpen, setEditHouseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [houseForm, setHouseForm] = useState({
    area: "",
    location: "",
    occupancyStatus: "owner_living" as OccupancyStatus,
    maintenancePayableBy: "owner" as MaintenancePayableBy,
  });

  const load = () => {
    if (!id) return;
    setLoading(true);
    getHouse(id)
      .then((res) => {
        setHouse(res.house);
        setHistory(res.ownerHistory);
        const h = res.house;
        setHouseForm({
          area: h.area !== undefined ? String(h.area) : "",
          location: h.location || "",
          occupancyStatus: h.occupancyStatus,
          maintenancePayableBy: h.maintenancePayableBy,
        });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading || !house || !id) return <Loader />;

  const type = house.houseTypeId && typeof house.houseTypeId === "object" ? house.houseTypeId : null;
  const currentOwner =
    house.currentOwnerId && typeof house.currentOwnerId === "object" ? house.currentOwnerId : null;
  const currentOwnerFull = history.find((o) => o.isCurrent) || null;

  const saveOwner = async (payload: OwnerPayload) => {
    setSaving(true);
    try {
      if (editOwner) {
        await updateOwner(editOwner._id, payload);
        toast.success("Owner updated");
      } else {
        await assignOwner(id, payload);
        toast.success("Owner assigned");
      }
      setAssignOpen(false);
      setEditOwner(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const doTransfer = async (payload: TransferPayload) => {
    setSaving(true);
    try {
      await transferOwner(id, payload);
      toast.success("Ownership transferred");
      setTransferOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveHouse = async () => {
    setSaving(true);
    try {
      await updateHouse(id, {
        area: houseForm.area !== "" ? Number(houseForm.area) : undefined,
        location: houseForm.location || undefined,
        occupancyStatus: houseForm.occupancyStatus,
        maintenancePayableBy: houseForm.maintenancePayableBy,
      });
      toast.success("House updated");
      setEditHouseOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await deleteHouse(id);
      toast.success("House deleted");
      navigate("/admin/houses");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  };

  const tabs = ["owner", ...comingSoon.map((c) => c.toLowerCase())];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{house.houseNo}</h1>
            <OccupancyBadge status={house.occupancyStatus} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {type ? `${type.code} - ${type.name}` : "-"}
            {house.area ? ` · ${house.area} sq ft` : ""}
            {house.location ? ` · ${house.location}` : ""}
          </p>
          <p className="text-sm text-gray-500 capitalize">
            Maintenance payable by: {house.maintenancePayableBy}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditHouseOpen(true)}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Delete House
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2 text-sm capitalize ${
              tab === t
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "owner" ? "Owner" : t}
          </button>
        ))}
      </div>

      {tab === "owner" ? (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-5 shadow">
            {currentOwner ? (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-medium">{currentOwner.name}</p>
                    {currentOwner.phone && <p className="text-sm text-gray-500">{currentOwner.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditOwner(currentOwnerFull)}
                      className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setTransferOpen(true)}
                      className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                    >
                      Transfer Ownership
                    </button>
                  </div>
                </div>
                {currentOwnerFull && (
                  <div className="mt-3 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                    {currentOwnerFull.altPhone && <p>Alt Phone: {currentOwnerFull.altPhone}</p>}
                    {currentOwnerFull.email && <p>Email: {currentOwnerFull.email}</p>}
                    {currentOwnerFull.idProofType && (
                      <p>
                        ID: {currentOwnerFull.idProofType} {currentOwnerFull.idProofNumber}
                      </p>
                    )}
                    <p>From: {formatDate(currentOwnerFull.fromDate)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-500">No owner assigned.</p>
                <button
                  onClick={() => setAssignOpen(true)}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                >
                  Assign Owner
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-3 text-lg font-semibold">Owner History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No history yet.</p>
            ) : (
              <ol className="relative ml-3 border-l border-gray-200">
                {history.map((o) => (
                  <li key={o._id} className="mb-4 ml-4">
                    <span
                      className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ${
                        o.isCurrent ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <p className="font-medium">
                      {o.name}
                      {o.isCurrent && (
                        <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(o.fromDate)} - {o.toDate ? formatDate(o.toDate) : "present"}
                    </p>
                    {o.transferNote && <p className="text-xs text-gray-400">{o.transferNote}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-8 text-center text-gray-400 shadow">
          {tab.charAt(0).toUpperCase() + tab.slice(1)} - coming soon
        </div>
      )}

      <OwnerFormModal
        open={assignOpen}
        mode="assign"
        loading={saving}
        onClose={() => setAssignOpen(false)}
        onSubmit={saveOwner}
      />
      <OwnerFormModal
        open={!!editOwner}
        mode="edit"
        initial={editOwner}
        loading={saving}
        onClose={() => setEditOwner(null)}
        onSubmit={saveOwner}
      />
      <TransferOwnershipModal
        open={transferOpen}
        loading={saving}
        onClose={() => setTransferOpen(false)}
        onSubmit={doTransfer}
      />

      <Modal
        open={editHouseOpen}
        title="Edit House"
        onClose={() => setEditHouseOpen(false)}
        footer={
          <>
            <button
              onClick={() => setEditHouseOpen(false)}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveHouse}
              disabled={saving}
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
              <label className="mb-1 block text-sm font-medium">Area (sq ft)</label>
              <input
                type="number"
                value={houseForm.area}
                onChange={(e) => setHouseForm({ ...houseForm, area: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <input
                value={houseForm.location}
                onChange={(e) => setHouseForm({ ...houseForm, location: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Occupancy</label>
              <select
                value={houseForm.occupancyStatus}
                onChange={(e) =>
                  setHouseForm({ ...houseForm, occupancyStatus: e.target.value as OccupancyStatus })
                }
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="owner_living">Owner living</option>
                <option value="rented">Rented</option>
                <option value="vacant">Vacant</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Maintenance Payable By</label>
              <select
                value={houseForm.maintenancePayableBy}
                onChange={(e) =>
                  setHouseForm({
                    ...houseForm,
                    maintenancePayableBy: e.target.value as MaintenancePayableBy,
                  })
                }
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete House"
        message={`Delete house ${house.houseNo}? This cannot be undone.`}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}