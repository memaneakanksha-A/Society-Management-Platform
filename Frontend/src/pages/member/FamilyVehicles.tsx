import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getFamily,
  createFamily,
  updateFamily,
  deleteFamily,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getErrorMessage,
} from "@/api/member.api";
import type { FamilyMember, MemberVehicle } from "@/types/member.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatDate } from "@/utils/formatDate";

interface FamilyForm {
  name: string;
  relation: string;
  gender: "male" | "female" | "other";
  dob: string;
  age: string;
  phone: string;
  bloodGroup: string;
  occupation: string;
  isEmergencyContact: boolean;
}

const emptyFamily: FamilyForm = {
  name: "",
  relation: "",
  gender: "male",
  dob: "",
  age: "",
  phone: "",
  bloodGroup: "",
  occupation: "",
  isEmergencyContact: false,
};

interface VehicleForm {
  type: MemberVehicle["type"];
  vehicleNo: string;
  make: string;
  vehicleModel: string;
  colour: string;
  parkingSlot: string;
  stickerNo: string;
}

const emptyVehicle: VehicleForm = {
  type: "two_wheeler",
  vehicleNo: "",
  make: "",
  vehicleModel: "",
  colour: "",
  parkingSlot: "",
  stickerNo: "",
};

const VEHICLE_TYPES = [
  { value: "two_wheeler", label: "Two Wheeler" },
  { value: "four_wheeler", label: "Four Wheeler" },
  { value: "cycle", label: "Cycle" },
  { value: "other", label: "Other" },
];

export default function FamilyVehicles() {
  const [tab, setTab] = useState("family");
  const [loading, setLoading] = useState(true);

  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [vehicles, setVehicles] = useState<MemberVehicle[]>([]);

  const [familyOpen, setFamilyOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [familyForm, setFamilyForm] = useState<FamilyForm>(emptyFamily);

  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<MemberVehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicle);

  const [saving, setSaving] = useState(false);
  const [delMember, setDelMember] = useState<FamilyMember | null>(null);
  const [delVehicle, setDelVehicle] = useState<MemberVehicle | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [f, v] = await Promise.all([getFamily(), getVehicles()]);
      setFamily(f);
      setVehicles(v);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAddMember = () => {
    setEditingMember(null);
    setFamilyForm(emptyFamily);
    setFamilyOpen(true);
  };

  const openEditMember = (m: FamilyMember) => {
    setEditingMember(m);
    setFamilyForm({
      name: m.name,
      relation: m.relation,
      gender: m.gender,
      dob: m.dob ? m.dob.split("T")[0] : "",
      age: m.age !== undefined ? String(m.age) : "",
      phone: m.phone || "",
      bloodGroup: m.bloodGroup || "",
      occupation: m.occupation || "",
      isEmergencyContact: m.isEmergencyContact,
    });
    setFamilyOpen(true);
  };

  const saveMember = async () => {
    setSaving(true);
    try {
      const payload = {
        name: familyForm.name.trim(),
        relation: familyForm.relation.trim(),
        gender: familyForm.gender,
        dob: familyForm.dob || undefined,
        age: familyForm.age ? Number(familyForm.age) : undefined,
        phone: familyForm.phone.trim() || undefined,
        bloodGroup: familyForm.bloodGroup.trim() || undefined,
        occupation: familyForm.occupation.trim() || undefined,
        isEmergencyContact: familyForm.isEmergencyContact,
      };
      if (editingMember) await updateFamily(editingMember._id, payload);
      else await createFamily(payload);
      toast.success(editingMember ? "Member updated" : "Member added");
      setFamilyOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteMember = async () => {
    if (!delMember) return;
    setSaving(true);
    try {
      await deleteFamily(delMember._id);
      toast.success("Member removed");
      setDelMember(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm(emptyVehicle);
    setVehicleOpen(true);
  };

  const openEditVehicle = (v: MemberVehicle) => {
    setEditingVehicle(v);
    setVehicleForm({
      type: v.type,
      vehicleNo: v.vehicleNo,
      make: v.make || "",
      vehicleModel: v.vehicleModel || "",
      colour: v.colour || "",
      parkingSlot: v.parkingSlot || "",
      stickerNo: v.stickerNo || "",
    });
    setVehicleOpen(true);
  };

  const saveVehicle = async () => {
    setSaving(true);
    try {
      const payload = {
        type: vehicleForm.type,
        vehicleNo: vehicleForm.vehicleNo.trim().toUpperCase(),
        make: vehicleForm.make.trim() || undefined,
        vehicleModel: vehicleForm.vehicleModel.trim() || undefined,
        colour: vehicleForm.colour.trim() || undefined,
        parkingSlot: vehicleForm.parkingSlot.trim() || undefined,
        stickerNo: vehicleForm.stickerNo.trim() || undefined,
      };
      if (editingVehicle) await updateVehicle(editingVehicle._id, payload);
      else await createVehicle(payload);
      toast.success(editingVehicle ? "Vehicle updated" : "Vehicle added");
      setVehicleOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteVehicle = async () => {
    if (!delVehicle) return;
    setSaving(true);
    try {
      await deleteVehicle(delVehicle._id);
      toast.success("Vehicle removed");
      setDelVehicle(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const familyColumns = useMemo(
    () => [
      { key: "name", header: "Name", render: (r: FamilyMember) => <span className="font-medium text-slate-900">{r.name}</span> },
      { key: "relation", header: "Relation", width: "120px", render: (r: FamilyMember) => <span className="text-slate-700">{r.relation}</span> },
      { key: "gender", header: "Gender", width: "100px", render: (r: FamilyMember) => <span className="capitalize text-slate-700">{r.gender}</span> },
      {
        key: "dob",
        header: "DOB / Age",
        width: "140px",
        render: (r: FamilyMember) => (
          <span className="text-slate-700">{r.dob ? formatDate(r.dob) : r.age !== undefined ? `${r.age} yrs` : "—"}</span>
        ),
      },
      { key: "phone", header: "Phone", width: "140px", render: (r: FamilyMember) => <span className="text-slate-700">{r.phone || "—"}</span> },
      {
        key: "actions",
        header: "",
        width: "170px",
        render: (r: FamilyMember) => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => openEditMember(r)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => setDelMember(r)}>Delete</Button>
          </div>
        ),
      },
    ],
    []
  );

  const vehicleColumns = useMemo(
    () => [
      { key: "vehicleNo", header: "Vehicle No", render: (r: MemberVehicle) => <span className="font-medium text-slate-900">{r.vehicleNo}</span> },
      {
        key: "type",
        header: "Type",
        width: "140px",
        render: (r: MemberVehicle) => <span className="text-slate-700">{VEHICLE_TYPES.find((o) => o.value === r.type)?.label || r.type}</span>,
      },
      {
        key: "model",
        header: "Make / Model",
        render: (r: MemberVehicle) => <span className="text-slate-700">{[r.make, r.vehicleModel].filter(Boolean).join(" ") || "—"}</span>,
      },
      { key: "parkingSlot", header: "Slot", width: "90px", render: (r: MemberVehicle) => <span className="text-slate-700">{r.parkingSlot || "—"}</span> },
      {
        key: "ownerType",
        header: "Owner",
        width: "100px",
        render: (r: MemberVehicle) => <Badge variant={r.ownerType === "owner" ? "indigo" : "blue"}>{r.ownerType}</Badge>,
      },
      {
        key: "actions",
        header: "",
        width: "170px",
        render: (r: MemberVehicle) => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => openEditVehicle(r)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => setDelVehicle(r)}>Delete</Button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading) return <Loader />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">My Family &amp; Vehicles</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your family members and vehicles</p>
      </div>

      <Tabs
        tabs={[
          { id: "family", label: `Family (${family.length})`, icon: "users" },
          { id: "vehicles", label: `Vehicles (${vehicles.length})`, icon: "car" },
        ]}
        activeTab={tab}
        onChange={setTab}
        variant="enclosed"
      />

      <TabPanel id="family">
        <div className="mb-3 flex justify-end">
          <Button leftIcon="plus" onClick={openAddMember}>Add Member</Button>
        </div>
        <DataTable
          columns={familyColumns}
          data={family}
          keyExtractor={(r) => r._id}
          loading={loading}
          emptyMessage="No family members added yet."
          emptyIcon="users"
          striped
          hoverable
        />
      </TabPanel>

      <TabPanel id="vehicles">
        <div className="mb-3 flex justify-end">
          <Button leftIcon="plus" onClick={openAddVehicle}>Add Vehicle</Button>
        </div>
        <DataTable
          columns={vehicleColumns}
          data={vehicles}
          keyExtractor={(r) => r._id}
          loading={loading}
          emptyMessage="No vehicles registered yet."
          emptyIcon="car"
          striped
          hoverable
        />
      </TabPanel>

      <Modal
        open={familyOpen}
        title={editingMember ? "Edit Family Member" : "Add Family Member"}
        onClose={() => setFamilyOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFamilyOpen(false)}>Cancel</Button>
            <Button onClick={saveMember} loading={saving} disabled={saving || !familyForm.name.trim() || !familyForm.relation.trim()} leftIcon="save">Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name *" value={familyForm.name} onChange={(e) => setFamilyForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Relation *" value={familyForm.relation} onChange={(e) => setFamilyForm((f) => ({ ...f, relation: e.target.value }))} />
            <Select
              label="Gender *"
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
              value={familyForm.gender}
              onChange={(e) => setFamilyForm((f) => ({ ...f, gender: e.target.value as FamilyForm["gender"] }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Date of Birth" type="date" value={familyForm.dob} onChange={(e) => setFamilyForm((f) => ({ ...f, dob: e.target.value }))} />
            <Input label="Age" type="number" min={0} value={familyForm.age} onChange={(e) => setFamilyForm((f) => ({ ...f, age: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" value={familyForm.phone} onChange={(e) => setFamilyForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Blood Group" value={familyForm.bloodGroup} onChange={(e) => setFamilyForm((f) => ({ ...f, bloodGroup: e.target.value }))} />
          </div>
          <Input label="Occupation" value={familyForm.occupation} onChange={(e) => setFamilyForm((f) => ({ ...f, occupation: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={familyForm.isEmergencyContact} onChange={(e) => setFamilyForm((f) => ({ ...f, isEmergencyContact: e.target.checked }))} className="h-4 w-4" />
            Emergency contact
          </label>
        </div>
      </Modal>

      <Modal
        open={vehicleOpen}
        title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
        onClose={() => setVehicleOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVehicleOpen(false)}>Cancel</Button>
            <Button onClick={saveVehicle} loading={saving} disabled={saving || !vehicleForm.vehicleNo.trim()} leftIcon="save">Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Vehicle No *" value={vehicleForm.vehicleNo} onChange={(e) => setVehicleForm((f) => ({ ...f, vehicleNo: e.target.value }))} />
            <Select label="Type *" options={VEHICLE_TYPES} value={vehicleForm.type} onChange={(e) => setVehicleForm((f) => ({ ...f, type: e.target.value as VehicleForm["type"] }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Make" value={vehicleForm.make} onChange={(e) => setVehicleForm((f) => ({ ...f, make: e.target.value }))} />
            <Input label="Model" value={vehicleForm.vehicleModel} onChange={(e) => setVehicleForm((f) => ({ ...f, vehicleModel: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Colour" value={vehicleForm.colour} onChange={(e) => setVehicleForm((f) => ({ ...f, colour: e.target.value }))} />
            <Input label="Parking Slot" value={vehicleForm.parkingSlot} onChange={(e) => setVehicleForm((f) => ({ ...f, parkingSlot: e.target.value }))} />
          </div>
          <Input label="Sticker No" value={vehicleForm.stickerNo} onChange={(e) => setVehicleForm((f) => ({ ...f, stickerNo: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delMember}
        title="Remove Family Member"
        message={`Remove "${delMember?.name}"?`}
        loading={saving}
        onConfirm={confirmDeleteMember}
        onCancel={() => setDelMember(null)}
      />

      <ConfirmDialog
        open={!!delVehicle}
        title="Remove Vehicle"
        message={`Remove "${delVehicle?.vehicleNo}"?`}
        loading={saving}
        onConfirm={confirmDeleteVehicle}
        onCancel={() => setDelVehicle(null)}
      />
    </div>
  );
}