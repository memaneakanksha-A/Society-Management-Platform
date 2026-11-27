import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Modal from "@/components/common/Modal";
import { Icon } from "@/components/ui/icons";
import type { Tenant, TenantFormData } from "@/types/tenant.types";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: Tenant | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

type FileKey = "aadhaar" | "agreement" | "policeVerification" | "photo";

const emptyForm: TenantFormData = {
  name: "",
  phone: "",
  altPhone: "",
  email: "",
  membersCount: "",
  occupation: "",
  workplace: "",
  permanentAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  idProofType: "",
  idProofNumber: "",
  rentAmount: "",
  depositAmount: "",
  agreementStartDate: "",
  agreementEndDate: "",
  policeVerificationStatus: "pending",
  policeVerificationDate: "",
  policeVerificationRemarks: "",
};

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = /\.(jpe?g|png|webp|pdf)$/i;

const docFields: Array<{ key: FileKey; label: string; accept: string }> = [
  { key: "aadhaar", label: "Aadhaar", accept: "image/jpeg,image/png,image/webp,application/pdf" },
  { key: "agreement", label: "Agreement", accept: "image/jpeg,image/png,image/webp,application/pdf" },
  { key: "policeVerification", label: "Police Verification", accept: "image/jpeg,image/png,image/webp,application/pdf" },
  { key: "photo", label: "Photo", accept: "image/jpeg,image/png,image/webp" },
];

export default function TenantForm({ open, mode, initial, loading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<TenantFormData>(emptyForm);
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [existing, setExisting] = useState<Partial<Record<FileKey, string>>>({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        phone: initial.phone || "",
        altPhone: initial.altPhone || "",
        email: initial.email || "",
        membersCount: initial.membersCount?.toString() || "",
        occupation: initial.occupation || "",
        workplace: initial.workplace || "",
        permanentAddress: initial.permanentAddress || "",
        emergencyContactName: initial.emergencyContact?.name || "",
        emergencyContactPhone: initial.emergencyContact?.phone || "",
        emergencyContactRelation: initial.emergencyContact?.relation || "",
        idProofType: initial.idProofType || "",
        idProofNumber: initial.idProofNumber || "",
        rentAmount: initial.rentAmount.toString(),
        depositAmount: initial.depositAmount.toString(),
        agreementStartDate: initial.agreementStartDate.split("T")[0],
        agreementEndDate: initial.agreementEndDate.split("T")[0],
        policeVerificationStatus: initial.policeVerification?.status || "pending",
        policeVerificationDate: initial.policeVerification?.date?.split("T")[0] || "",
        policeVerificationRemarks: initial.policeVerification?.remarks || "",
      });
      setExisting({
        aadhaar: initial.documents?.aadhaar,
        agreement: initial.documents?.agreement,
        policeVerification: initial.documents?.policeVerification,
        photo: initial.documents?.photo,
      });
    } else {
      setForm(emptyForm);
      setExisting({});
    }
    setFiles({});
  }, [open, initial]);

  const set = (key: keyof TenantFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onFile = (key: FileKey, file?: File) => {
    if (!file) {
      setFiles((f) => {
        const next = { ...f };
        delete next[key];
        return next;
      });
      return;
    }
    if (!ALLOWED.test(file.name)) {
      toast.error("Only JPEG, PNG, WebP or PDF files are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File too large. Max 5 MB per file");
      return;
    }
    setFiles((f) => ({ ...f, [key]: file }));
  };

  const submit = async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== "") fd.append(k, v);
    });
    if (form.emergencyContactName || form.emergencyContactPhone || form.emergencyContactRelation) {
      fd.append(
        "emergencyContact",
        JSON.stringify({
          name: form.emergencyContactName,
          phone: form.emergencyContactPhone,
          relation: form.emergencyContactRelation,
        })
      );
    }
    (Object.keys(files) as FileKey[]).forEach((k) => {
      const f = files[k];
      if (f) fd.append(k, f);
    });
    try {
      await onSubmit(fd);
    } catch {
      // parent handles error toast
    }
  };

  const fileRow = (key: FileKey, label: string, accept: string) => (
    <div key={key}>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onFile(key, e.target.files?.[0])}
        className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
      />
      {files[key] ? (
        <p className="mt-1 truncate text-xs text-green-600">Selected: {files[key]?.name}</p>
      ) : existing[key] ? (
        <p className="mt-1 truncate text-xs text-slate-500">Current: {existing[key]}</p>
      ) : null}
    </div>
  );

  const canSave =
    !!form.name.trim() &&
    !!form.rentAmount &&
    !!form.agreementStartDate &&
    !!form.agreementEndDate;

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Add Tenant" : "Edit Tenant"}
      onClose={onClose}
      wide
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !canSave}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon name="user" size={18} className="text-indigo-600" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Alt Phone</label>
                <input
                  value={form.altPhone}
                  onChange={(e) => set("altPhone", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Members Count</label>
                <input
                  type="number"
                  min="0"
                  value={form.membersCount}
                  onChange={(e) => set("membersCount", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Occupation</label>
                <input
                  value={form.occupation}
                  onChange={(e) => set("occupation", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Workplace</label>
                <input
                  value={form.workplace}
                  onChange={(e) => set("workplace", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Permanent Address</label>
              <textarea
                value={form.permanentAddress}
                onChange={(e) => set("permanentAddress", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon name="phone" size={18} className="text-indigo-600" />
            Emergency Contact
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                value={form.emergencyContactName}
                onChange={(e) => set("emergencyContactName", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <input
                value={form.emergencyContactPhone}
                onChange={(e) => set("emergencyContactPhone", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Relation</label>
              <input
                value={form.emergencyContactRelation}
                onChange={(e) => set("emergencyContactRelation", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon name="shield" size={18} className="text-indigo-600" />
            ID Proof
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ID Proof Type</label>
              <input
                value={form.idProofType}
                onChange={(e) => set("idProofType", e.target.value)}
                placeholder="e.g., Aadhaar, PAN, Passport"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ID Proof Number</label>
              <input
                value={form.idProofNumber}
                onChange={(e) => set("idProofNumber", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon name="file" size={18} className="text-indigo-600" />
            Agreement
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Date *</label>
              <input
                type="date"
                value={form.agreementStartDate}
                onChange={(e) => set("agreementStartDate", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Date *</label>
              <input
                type="date"
                value={form.agreementEndDate}
                onChange={(e) => set("agreementEndDate", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rent (₹) *</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.rentAmount}
                onChange={(e) => set("rentAmount", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Deposit (₹) *</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.depositAmount}
                onChange={(e) => set("depositAmount", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon name="shield" size={18} className="text-indigo-600" />
            Police Verification
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.policeVerificationStatus}
                onChange={(e) => set("policeVerificationStatus", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="pending">Pending</option>
                <option value="done">Done</option>
                <option value="not_required">Not Required</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={form.policeVerificationDate}
                onChange={(e) => set("policeVerificationDate", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
              <input
                value={form.policeVerificationRemarks}
                onChange={(e) => set("policeVerificationRemarks", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon name="upload" size={18} className="text-indigo-600" />
            Documents
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {docFields.map((d) => fileRow(d.key, d.label, d.accept))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Max 5 MB per file. Allowed: JPEG, PNG, WebP, PDF.</p>
        </section>
      </div>
    </Modal>
  );
}