import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import type { Owner, OwnerPayload } from "@/types/house.types";

interface Props {
  open: boolean;
  mode: "assign" | "edit";
  initial?: Owner | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: OwnerPayload) => void;
}

const empty: OwnerPayload = {
  name: "",
  phone: "",
  altPhone: "",
  email: "",
  idProofType: "",
  idProofNumber: "",
};

export default function OwnerFormModal({ open, mode, initial, loading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<OwnerPayload>(empty);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              phone: initial.phone || "",
              altPhone: initial.altPhone || "",
              email: initial.email || "",
              idProofType: initial.idProofType || "",
              idProofNumber: initial.idProofNumber || "",
            }
          : empty
      );
    }
  }, [open, initial]);

  const set = (key: keyof OwnerPayload, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const payload: OwnerPayload = {
      name: form.name.trim(),
      phone: form.phone?.trim() || undefined,
      altPhone: form.altPhone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      idProofType: form.idProofType?.trim() || undefined,
      idProofNumber: form.idProofNumber?.trim() || undefined,
    };
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      title={mode === "assign" ? "Assign Owner" : "Edit Owner"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !form.name.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Name *</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Alt Phone</label>
            <input
              value={form.altPhone}
              onChange={(e) => set("altPhone", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">ID Proof Type</label>
            <input
              value={form.idProofType}
              onChange={(e) => set("idProofType", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">ID Proof Number</label>
            <input
              value={form.idProofNumber}
              onChange={(e) => set("idProofNumber", e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}