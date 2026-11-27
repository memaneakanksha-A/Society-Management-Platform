import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import type { FamilyMember, FamilyMemberFormData, Gender } from "@/types/tenant.types";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: FamilyMember | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: FamilyMemberFormData) => void;
}

const empty: FamilyMemberFormData = {
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

export default function FamilyFormModal({ open, mode, initial, loading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FamilyMemberFormData>(empty);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        relation: initial.relation,
        gender: initial.gender,
        dob: initial.dob ? initial.dob.split("T")[0] : "",
        age: initial.age?.toString() || "",
        phone: initial.phone || "",
        bloodGroup: initial.bloodGroup || "",
        occupation: initial.occupation || "",
        isEmergencyContact: initial.isEmergencyContact,
      });
    } else {
      setForm(empty);
    }
  }, [open, initial]);

  const set = <K extends keyof FamilyMemberFormData>(key: K, value: FamilyMemberFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    onSubmit({
      ...form,
      name: form.name.trim(),
      relation: form.relation.trim(),
      age: form.age || (form.dob ? "" : ""),
      dob: form.dob || "",
    });
  };

  const canSave = !!form.name.trim() && !!form.relation.trim();

  return (
    <Modal
      open={open}
      title={mode === "edit" ? "Edit Family Member" : "Add Family Member"}
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
            {loading ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Relation *</label>
            <input
              value={form.relation}
              onChange={(e) => set("relation", e.target.value)}
              placeholder="e.g., Father, Spouse"
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gender *</label>
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value as Gender)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date of Birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
            <input
              type="number"
              min="0"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Blood Group</label>
            <input
              value={form.bloodGroup}
              onChange={(e) => set("bloodGroup", e.target.value)}
              placeholder="e.g., O+"
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Occupation</label>
          <input
            value={form.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isEmergencyContact}
            onChange={(e) => set("isEmergencyContact", e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700">Emergency contact</span>
        </label>
      </div>
    </Modal>
  );
}