import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import TenantForm from "@/components/tenant/TenantForm";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { getErrorMessage } from "@/api/axios";
import {
  getTenant,
  updateTenant,
  renewTenant,
  vacateTenant,
  getTenantDocumentBlob,
  openBlobInNewTab,
} from "@/api/tenant.api";
import type { Tenant, AgreementState, PoliceVerificationStatus } from "@/types/tenant.types";
import { Icon } from "@/components/ui/icons";

const agreementStateColors: Record<AgreementState, string> = {
  valid: "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};

const policeStatusLabels: Record<PoliceVerificationStatus, string> = {
  pending: "Pending",
  done: "Done",
  not_required: "Not Required",
};

const policeStatusColors: Record<PoliceVerificationStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  not_required: "bg-gray-100 text-gray-700",
};

const statusColors: Record<Tenant["status"], string> = {
  active: "bg-green-100 text-green-700",
  vacated: "bg-gray-100 text-gray-700",
};

export default function TenantDetail() {
  const { id } = useParams();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [vacateOpen, setVacateOpen] = useState(false);

  const [renewForm, setRenewForm] = useState({
    agreementStartDate: "",
    agreementEndDate: "",
    rentAmount: "",
    depositAmount: "",
    agreementFile: null as File | null,
  });
  const [renewError, setRenewError] = useState("");
  const [vacateForm, setVacateForm] = useState({
    vacatedOn: new Date().toISOString().split("T")[0],
    reason: "",
    markVacant: false,
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const t = await getTenant(id);
      setTenant(t);
      setRenewForm({
        agreementStartDate: t.agreementStartDate.split("T")[0],
        agreementEndDate: t.agreementEndDate.split("T")[0],
        rentAmount: t.rentAmount.toString(),
        depositAmount: t.depositAmount.toString(),
        agreementFile: null,
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading || !tenant || !id) return <Loader />;

  const handleViewDocument = async (type: "aadhaar" | "agreement" | "policeVerification" | "photo") => {
    try {
      const blob = await getTenantDocumentBlob(id, type);
      openBlobInNewTab(blob);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReplaceDocument = () => {
    setEditOpen(true);
  };

  const handleEditSubmit = async (formData: FormData) => {
    setSaving(true);
    try {
      await updateTenant(id, formData);
      toast.success("Tenant updated");
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openRenew = () => {
    setRenewError("");
    setRenewOpen(true);
  };

  const handleRenewSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const start = new Date(renewForm.agreementStartDate);
    const end = new Date(renewForm.agreementEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setRenewError("Both dates are required and must be valid");
      return;
    }
    if (end <= start) {
      setRenewError("End date must be after start date");
      return;
    }
    setRenewError("");

    const formData = new FormData();
    formData.append("agreementStartDate", renewForm.agreementStartDate);
    formData.append("agreementEndDate", renewForm.agreementEndDate);
    formData.append("rentAmount", renewForm.rentAmount);
    formData.append("depositAmount", renewForm.depositAmount);
    if (renewForm.agreementFile) formData.append("agreement", renewForm.agreementFile);

    setSaving(true);
    try {
      await renewTenant(id, formData);
      toast.success("Agreement renewed");
      setRenewOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleVacateSubmit = async () => {
    setSaving(true);
    try {
      await vacateTenant(id, vacateForm);
      toast.success("Tenant vacated");
      setVacateOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const state = tenant.agreementState || "valid";
  const stateLabel = state === "valid" ? "Valid" : state === "expiring_soon" ? "Expiring Soon" : "Expired";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{tenant.name}</h1>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${agreementStateColors[state]}`}>
              {stateLabel}
            </span>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status]}`}>
              {tenant.status === "active" ? "Active" : "Vacated"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            House: <span className="font-medium text-slate-900">{tenant.house?.houseNo || "-"}</span>
            {tenant.phone && <span className="ml-3">Phone: {tenant.phone}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {tenant.status === "active" && (
            <>
              <button onClick={openRenew} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
                Renew Agreement
              </button>
              <button onClick={() => setVacateOpen(true)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
                Vacate
              </button>
            </>
          )}
          <button onClick={() => setEditOpen(true)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
            Edit
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium">{tenant.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p>{tenant.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Alt Phone</p>
                <p>{tenant.altPhone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p>{tenant.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Members Count</p>
                <p>{tenant.membersCount || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Occupation</p>
                <p>{tenant.occupation || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Workplace</p>
                <p>{tenant.workplace || "-"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-slate-500">Permanent Address</p>
                <p>{tenant.permanentAddress || "-"}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">Emergency Contact</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p>{tenant.emergencyContact?.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p>{tenant.emergencyContact?.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Relation</p>
                <p>{tenant.emergencyContact?.relation || "-"}</p>
              </div>
            </div>
          </div>

          {/* ID Proof */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">ID Proof</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Type</p>
                <p>{tenant.idProofType || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Number</p>
                <p>{tenant.idProofNumber || "-"}</p>
              </div>
            </div>
          </div>

          {/* Agreement Details */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">Agreement Details</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">Start Date</p>
                <p className="font-medium">{formatDate(tenant.agreementStartDate)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">End Date</p>
                <p className="font-medium">{formatDate(tenant.agreementEndDate)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Rent</p>
                <p className="font-medium">{formatCurrency(tenant.rentAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Deposit</p>
                <p className="font-medium">{formatCurrency(tenant.depositAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Days Left</p>
                <p className={`font-medium ${tenant.daysLeft !== undefined && tenant.daysLeft < 0 ? "text-red-600" : tenant.daysLeft !== undefined && tenant.daysLeft <= 30 ? "text-amber-600" : "text-green-600"}`}>
                  {tenant.status === "vacated" ? "-" : tenant.daysLeft ?? 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <p><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${agreementStateColors[state]}`}>{stateLabel}</span></p>
              </div>
              <div className="sm:col-span-4">
                <p className="text-sm text-slate-500">Remarks</p>
                <p>{tenant.remarks || "-"}</p>
              </div>
            </div>
          </div>

          {/* Police Verification */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">Police Verification</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${policeStatusColors[tenant.policeVerification?.status || "pending"]}`}>
                    {policeStatusLabels[tenant.policeVerification?.status || "pending"]}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Date</p>
                <p>{tenant.policeVerification?.date ? formatDate(tenant.policeVerification.date) : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Remarks</p>
                <p>{tenant.policeVerification?.remarks || "-"}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">Documents</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { key: "aadhaar", label: "Aadhaar", icon: "file" },
                { key: "agreement", label: "Agreement", icon: "file" },
                { key: "policeVerification", label: "Police Verification", icon: "file" },
                { key: "photo", label: "Photo", icon: "image" },
              ] as const).map((d) => {
                const has = !!tenant.documents?.[d.key];
                return (
                  <div key={d.key} className="flex items-center justify-between rounded border px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Icon name={d.icon} size={16} /> {d.label}
                    </span>
                    <span className="flex items-center gap-2">
                      {has ? (
                        <>
                          <button
                            onClick={() => handleViewDocument(d.key)}
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            View
                          </button>
                          <button
                            onClick={handleReplaceDocument}
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            Replace
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleReplaceDocument}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Upload
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {!tenant.documents?.aadhaar && !tenant.documents?.agreement && !tenant.documents?.policeVerification && !tenant.documents?.photo && (
              <p className="mt-3 text-sm text-slate-500">No documents uploaded yet.</p>
            )}
          </div>

          {/* Agreement History */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">Agreement History</h2>
            {tenant.agreements?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2">Start Date</th>
                      <th className="pb-2">End Date</th>
                      <th className="pb-2">Rent</th>
                      <th className="pb-2">Deposit</th>
                      <th className="pb-2">File</th>
                      <th className="pb-2">Renewed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenant.agreements.map((a, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{formatDate(a.startDate)}</td>
                        <td className="py-2">{formatDate(a.endDate)}</td>
                        <td className="py-2">{formatCurrency(a.rentAmount)}</td>
                        <td className="py-2">{formatCurrency(a.depositAmount)}</td>
                        <td className="py-2">{a.file ? "Yes" : "-"}</td>
                        <td className="py-2">{formatDate(a.renewedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No previous agreements. Renewals will appear here.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tenant Status */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h3 className="mb-3 text-lg font-semibold">Tenant Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status]}`}>
                  {tenant.status === "active" ? "Active" : "Vacated"}
                </span>
              </div>
              {tenant.status === "active" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Agreement</span>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${agreementStateColors[state]}`}>
                    {stateLabel}
                  </span>
                </div>
              )}
              {tenant.vacatedOn && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Vacated On</span>
                  <span className="text-sm">{formatDate(tenant.vacatedOn)}</span>
                </div>
              )}
              {tenant.vacateReason && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-500">Vacate Reason</span>
                  <span className="text-sm text-slate-600">{tenant.vacateReason}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TenantForm
        open={editOpen}
        mode="edit"
        initial={tenant}
        loading={saving}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />

      <Modal
        open={renewOpen}
        title="Renew Agreement"
        onClose={() => setRenewOpen(false)}
        wide
        footer={
          <>
            <button type="button" onClick={() => setRenewOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              form="renew-agreement-form"
              disabled={saving || !renewForm.agreementStartDate || !renewForm.agreementEndDate || !renewForm.rentAmount || !renewForm.depositAmount}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Renew"}
            </button>
          </>
        }
      >
        <form id="renew-agreement-form" onSubmit={handleRenewSubmit} className="space-y-4">
          {renewError && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{renewError}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">New Start Date *</label>
              <input
                type="date"
                value={renewForm.agreementStartDate}
                onChange={(e) => setRenewForm({ ...renewForm, agreementStartDate: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">New End Date *</label>
              <input
                type="date"
                value={renewForm.agreementEndDate}
                onChange={(e) => setRenewForm({ ...renewForm, agreementEndDate: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">New Rent *</label>
              <input
                type="number"
                min="0"
                step="100"
                value={renewForm.rentAmount}
                onChange={(e) => setRenewForm({ ...renewForm, rentAmount: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">New Deposit *</label>
              <input
                type="number"
                min="0"
                step="100"
                value={renewForm.depositAmount}
                onChange={(e) => setRenewForm({ ...renewForm, depositAmount: e.target.value })}
                className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">New Agreement Document (optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setRenewForm({ ...renewForm, agreementFile: e.target.files?.[0] || null })}
              className="w-full text-sm"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={vacateOpen}
        title="Vacate Tenant"
        onClose={() => setVacateOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setVacateOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVacateSubmit}
              disabled={saving}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? "Processing..." : "Vacate"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Vacated On *</label>
            <input
              type="date"
              value={vacateForm.vacatedOn}
              onChange={(e) => setVacateForm({ ...vacateForm, vacatedOn: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Reason *</label>
            <textarea
              value={vacateForm.reason}
              onChange={(e) => setVacateForm({ ...vacateForm, reason: e.target.value })}
              rows={3}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
              required
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={vacateForm.markVacant}
              onChange={(e) => setVacateForm({ ...vacateForm, markVacant: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm">Mark house as vacant (instead of owner living)</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}