import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import Pagination from "@/components/common/Pagination";
import OccupancyBadge from "@/components/house/OccupancyBadge";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/api/axios";
import { getHouses, getHouseStats, getHouseTypes, createHouse } from "@/api/house.api";
import type {
  House,
  HouseStats,
  HouseType,
  OccupancyStatus,
  MaintenancePayableBy,
} from "@/types/house.types";

const emptyStats: HouseStats = {
  total: 0,
  ownerLiving: 0,
  rented: 0,
  vacant: 0,
  withoutOwner: 0,
  byType: [],
};

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

  const ownerOf = (h: House) =>
    h.currentOwnerId && typeof h.currentOwnerId === "object" ? h.currentOwnerId : null;
  const typeOf = (h: House) =>
    h.houseTypeId && typeof h.houseTypeId === "object" ? h.houseTypeId : null;

  if (loading && houses.length === 0) return <Loader />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Houses</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/admin/houses/bulk")}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Bulk Create
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            + Add House
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total", value: stats.total },
          { label: "Owner living", value: stats.ownerLiving },
          { label: "Rented", value: stats.rented },
          { label: "Vacant", value: stats.vacant },
          { label: "Without owner", value: stats.withoutOwner },
        ].map((c) => (
          <div key={c.label} className="rounded-lg bg-white p-4 shadow">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search house no or owner"
          className="w-64 rounded border px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="rounded border px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t._id} value={t._id}>
              {t.code} - {t.name}
            </option>
          ))}
        </select>
        <select
          value={occupancy}
          onChange={(e) => setOccupancy(e.target.value)}
          className="rounded border px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">All occupancy</option>
          <option value="owner_living">Owner living</option>
          <option value="rented">Rented</option>
          <option value="vacant">Vacant</option>
        </select>
      </div>

      <div className="mb-2 text-sm text-gray-500">{total} houses</div>

      {houses.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No houses found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">House No</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Current Owner</th>
                <th className="px-4 py-3">Occupancy</th>
                <th className="px-4 py-3">Maintenance By</th>
              </tr>
            </thead>
            <tbody>
              {houses.map((h) => {
                const owner = ownerOf(h);
                const type = typeOf(h);
                return (
                  <tr
                    key={h._id}
                    onClick={() => navigate(`/admin/houses/${h._id}`)}
                    className="cursor-pointer border-t hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">{h.houseNo}</td>
                    <td className="px-4 py-3">{type ? `${type.code} - ${type.name}` : "-"}</td>
                    <td className="px-4 py-3">{h.area ?? "-"}</td>
                    <td className="px-4 py-3">{h.location || "-"}</td>
                    <td className="px-4 py-3">
                      {owner ? (
                        <div>
                          <p>{owner.name}</p>
                          {owner.phone && <p className="text-xs text-gray-400">{owner.phone}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <OccupancyBadge status={h.occupancyStatus} />
                    </td>
                    <td className="px-4 py-3 capitalize">{h.maintenancePayableBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onPage={setPage} />

      <Modal
        open={addOpen}
        title="Add House"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button
              onClick={() => setAddOpen(false)}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveHouse}
              disabled={saving || !form.houseTypeId || !form.houseNo.trim()}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">House Type *</label>
              <select
                value={form.houseTypeId}
                onChange={(e) => setForm({ ...form, houseTypeId: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="">Select type</option>
                {types.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">House No *</label>
              <input
                value={form.houseNo}
                onChange={(e) => setForm({ ...form, houseNo: e.target.value.toUpperCase() })}
                className="w-full rounded border px-3 py-2 uppercase outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Area (sq ft)</label>
              <input
                type="number"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Occupancy</label>
              <select
                value={form.occupancyStatus}
                onChange={(e) =>
                  setForm({ ...form, occupancyStatus: e.target.value as OccupancyStatus })
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
                value={form.maintenancePayableBy}
                onChange={(e) =>
                  setForm({
                    ...form,
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
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}