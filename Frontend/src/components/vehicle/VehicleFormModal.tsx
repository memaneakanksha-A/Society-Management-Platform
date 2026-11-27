import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/common/Modal";
import { Icon } from "@/components/ui/icons";
import type { Vehicle, VehicleType, VehicleFormData } from "@/types/tenant.types";
import type { House } from "@/types/house.types";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: Vehicle | null;
  houses: House[];
  housesLoading?: boolean;
  loading?: boolean;
  defaultHouseId?: string;
  onClose: () => void;
  onSubmit: (form: VehicleFormData) => void;
}

const empty: VehicleFormData = {
  houseId: "",
  ownerType: "owner",
  type: "two_wheeler",
  vehicleNo: "",
  make: "",
  vehicleModel: "",
  colour: "",
  parkingSlot: "",
  stickerNo: "",
  isActive: true,
};

const typeOptions: Array<{ value: VehicleType; label: string }> = [
  { value: "two_wheeler", label: "Two Wheeler" },
  { value: "four_wheeler", label: "Four Wheeler" },
  { value: "cycle", label: "Cycle" },
  { value: "other", label: "Other" },
];

export default function VehicleFormModal({
  open,
  mode,
  initial,
  houses,
  housesLoading,
  loading,
  defaultHouseId,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<VehicleFormData>(empty);
  const [houseSearch, setHouseSearch] = useState("");
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        houseId: typeof initial.houseId === "object" ? (initial.houseId as unknown as { _id: string })._id : initial.houseId,
        ownerType: initial.ownerType,
        type: initial.type,
        vehicleNo: initial.vehicleNo,
        make: initial.make || "",
        vehicleModel: initial.vehicleModel || "",
        colour: initial.colour || "",
        parkingSlot: initial.parkingSlot || "",
        stickerNo: initial.stickerNo || "",
        isActive: initial.isActive,
      });
    } else {
      setForm({ ...empty, houseId: defaultHouseId || "" });
    }
    setHouseSearch("");
    setShowList(false);
  }, [open, initial, defaultHouseId]);

  const set = <K extends keyof VehicleFormData>(key: K, value: VehicleFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const filteredHouses = useMemo(() => {
    const q = houseSearch.trim().toLowerCase();
    if (!q) return houses;
    return houses.filter((h) => h.houseNo.toLowerCase().includes(q));
  }, [houses, houseSearch]);

  const selectedHouse = houses.find((h) => h._id === form.houseId) || null;
  const ownerName =
    selectedHouse && typeof selectedHouse.currentOwnerId === "object"
      ? selectedHouse.currentOwnerId?.name
      : undefined;
  const tenantName =
    selectedHouse && typeof selectedHouse.currentTenantId === "object"
      ? selectedHouse.currentTenantId?.name
      : undefined;
  const hasTenant = !!selectedHouse?.currentTenantId;

  const submit = () => {
    onSubmit({
      ...form,
      vehicleNo: form.vehicleNo.trim().toUpperCase().replace(/\s+/g, ""),
    });
  };

  const canSave = !!form.houseId && !!form.vehicleNo.trim() && (form.ownerType !== "tenant" || hasTenant);

  return (
    <Modal
      open={open}
      title={mode === "edit" ? "Edit Vehicle" : "Add Vehicle"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !canSave}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : mode === "edit" ? "Update" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-slate-700">House *</label>
            <div className="relative">
              <input
                value={showList ? houseSearch : selectedHouse?.houseNo || ""}
                onChange={(e) => {
                  setHouseSearch(e.target.value);
                  setShowList(true);
                  if (form.houseId) set("houseId", "");
                }}
                onFocus={() => {
                  setShowList(true);
                  setHouseSearch("");
                }}
                disabled={mode === "edit"}
                placeholder={housesLoading ? "Loading houses..." : "Search house no"}
                className="w-full rounded border px-3 py-2 pr-9 outline-none focus:border-indigo-500 disabled:opacity-60"
              />
              <Icon
                name="chevronDown"
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            {showList && mode !== "edit" && (
              <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded border bg-white shadow-lg">
                {filteredHouses.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">No houses found</p>
                ) : (
                  filteredHouses.map((h) => (
                    <button
                      key={h._id}
                      type="button"
                      onClick={() => {
                        set("houseId", h._id);
                        setShowList(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
                    >
                      {h.houseNo}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Owner Type *</label>
            <select
              value={form.ownerType}
              onChange={(e) => setForm((f) => ({ ...f, ownerType: e.target.value as "owner" | "tenant" }))}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="owner">Owner</option>
              <option value="tenant" disabled={!hasTenant}>
                Tenant{!hasTenant ? " (none)" : ""}
              </option>
            </select>
          </div>
        </div>

        {selectedHouse && (
          <div className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <p>Owner: {ownerName || "None"}</p>
            <p>Tenant: {hasTenant ? tenantName || "None" : "None"}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type *</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as VehicleType)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Vehicle No *</label>
            <input
              value={form.vehicleNo}
              onChange={(e) => set("vehicleNo", e.target.value.toUpperCase().replace(/\s+/g, ""))}
              className="w-full rounded border px-3 py-2 uppercase outline-none focus:border-indigo-500"
              placeholder="e.g., MH12AB1234"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Make</label>
            <input
              value={form.make}
              onChange={(e) => set("make", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Model</label>
            <input
              value={form.vehicleModel}
              onChange={(e) => set("vehicleModel", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Colour</label>
            <input
              value={form.colour}
              onChange={(e) => set("colour", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Parking Slot</label>
            <input
              value={form.parkingSlot}
              onChange={(e) => set("parkingSlot", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sticker No</label>
            <input
              value={form.stickerNo}
              onChange={(e) => set("stickerNo", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex w-full items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}