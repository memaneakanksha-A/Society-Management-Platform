import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import type { TransferPayload } from "@/types/house.types";

interface Props {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: TransferPayload) => void;
}

const empty: TransferPayload = {
  name: "",
  phone: "",
  email: "",
  altPhone: "",
  idProofType: "",
  idProofNumber: "",
  transferDate: "",
  transferNote: "",
};

export default function TransferOwnershipModal({ open, loading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<TransferPayload>(empty);

  useEffect(() => {
    if (open) setForm(empty);
  }, [open]);

  const set = (key: keyof TransferPayload, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    onSubmit({
      name: form.name.trim(),
      phone: form.phone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      altPhone: form.altPhone?.trim() || undefined,
      idProofType: form.idProofType?.trim() || undefined,
      idProofNumber: form.idProofNumber?.trim() || undefined,
      transferDate: form.transferDate || undefined,
      transferNote: form.transferNote?.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      title="Transfer Ownership"
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
            {loading ? "Saving..." : "Transfer"}
          </button>
        </>
      }
    >
      <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        The current owner will be moved to history and the new owner will become current.
      </div>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">New Owner Name *</label>
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
        <div>
          <label className="mb-1 block text-sm font-medium">Transfer Date</label>
          <input
            type="date"
            value={form.transferDate}
            onChange={(e) => set("transferDate", e.target.value)}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Transfer Note</label>
          <textarea
            value={form.transferNote}
            onChange={(e) => set("transferNote", e.target.value)}
            rows={2}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </Modal>
  );
}