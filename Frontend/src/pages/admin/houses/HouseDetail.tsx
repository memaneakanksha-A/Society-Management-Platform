import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import OccupancyBadge from "@/components/house/OccupancyBadge";
import OwnerFormModal from "@/components/house/OwnerFormModal";
import FamilyFormModal from "@/components/house/FamilyFormModal";
import TransferOwnershipModal from "@/components/house/TransferOwnershipModal";
import TenantForm from "@/components/tenant/TenantForm";
import VehicleFormModal from "@/components/vehicle/VehicleFormModal";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { getErrorMessage } from "@/api/axios";
import {
  getHouse,
  updateHouse,
  deleteHouse,
  assignOwner,
  updateOwner,
  transferOwner,
} from "@/api/house.api";
import { getHouseLedger, getShares } from "@/api/maintenance.api";
import type { HouseLedgerResponse, ShareRecord } from "@/types/maintenance.types";
import {
  createTenant,
  getHouseTenants,
  getHouseVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from "@/api/tenant.api";
import type {
  House,
  Owner,
  OccupancyStatus,
  MaintenancePayableBy,
  OwnerPayload,
  TransferPayload,
} from "@/types/house.types";
import type {
  Tenant,
  Vehicle,
  FamilyMember,
  FamilyMemberFormData,
  VehicleFormData,
  AgreementState,
} from "@/types/tenant.types";
import {
  listHouseDocuments,
  uploadHouseDocument,
  updateHouseDocument,
  deleteHouseDocument,
  openHouseDocument,
} from "@/api/houseDocument.api";
import type { HouseDocument, HouseDocumentType } from "@/api/houseDocument.api";

const DOC_TYPES: { value: HouseDocumentType; label: string }[] = [
  { value: "sale_deed", label: "Sale Deed" },
  { value: "share_certificate", label: "Share Certificate" },
  { value: "noc", label: "NOC" },
  { value: "id_proof", label: "ID Proof" },
  { value: "tax_bill", label: "Tax Bill" },
  { value: "electricity_bill", label: "Electricity Bill" },
  { value: "other", label: "Other" },
];

const MAX_DOC_SIZE = 5 * 1024 * 1024;
const DOC_ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const docTypeLabel = (t: string): string =>
  DOC_TYPES.find((d) => d.value === t)?.label || t;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const agreementColors: Record<AgreementState, string> = {
  valid: "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};

export default function HouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [house, setHouse] = useState<House | null>(null);
  const [history, setHistory] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string>("owner");

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

  // Tenant tab
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantFormOpen, setTenantFormOpen] = useState(false);

  // Vehicles tab
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleDelete, setVehicleDelete] = useState<Vehicle | null>(null);

  // Family tab
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyFormOpen, setFamilyFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [memberDelete, setMemberDelete] = useState<FamilyMember | null>(null);

  // Maintenance tab
  const [ledger, setLedger] = useState<HouseLedgerResponse | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Share tab
  const [shareRecord, setShareRecord] = useState<ShareRecord | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  // Documents tab
  const [documents, setDocuments] = useState<HouseDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<HouseDocument | null>(null);
  const [docForm, setDocForm] = useState<{ title: string; docType: HouseDocumentType; notes: string }>({
    title: "",
    docType: "other",
    notes: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docDelete, setDocDelete] = useState<HouseDocument | null>(null);

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

  const loadTenants = () => {
    if (!id) return;
    setTenantsLoading(true);
    getHouseTenants(id)
      .then(setTenants)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setTenantsLoading(false));
  };

  const loadVehicles = () => {
    if (!id) return;
    setVehiclesLoading(true);
    getHouseVehicles(id)
      .then(setVehicles)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setVehiclesLoading(false));
  };

  const loadFamily = () => {
    if (!id) return;
    setFamilyLoading(true);
    getFamilyMembers(id)
      .then(setFamily)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setFamilyLoading(false));
  };

  const loadLedger = () => {
    if (!id) return;
    setLedgerLoading(true);
    getHouseLedger(id)
      .then(setLedger)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLedgerLoading(false));
  };

  const loadShare = () => {
    if (!id || !house) return;
    setShareLoading(true);
    getShares({ search: house.houseNo, limit: 500 })
      .then((res) => {
        const rec =
          res.shares.find((s) =>
            typeof s.houseId === "object" ? s.houseId?._id === id : s.houseId === id
          ) || null;
        setShareRecord(rec);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setShareLoading(false));
  };

  const loadDocuments = () => {
    if (!id) return;
    setDocumentsLoading(true);
    listHouseDocuments(id)
      .then(setDocuments)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setDocumentsLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    if (tab === "tenant") loadTenants();
    if (tab === "vehicles") loadVehicles();
    if (tab === "family") loadFamily();
    if (tab === "maintenance") loadLedger();
    if (tab === "share") loadShare();
    if (tab === "documents") loadDocuments();
  }, [tab, id]);

  if (loading || !house || !id) return <Loader />;

  const type = house.houseTypeId && typeof house.houseTypeId === "object" ? house.houseTypeId : null;
  const currentOwnerFull = history.find((o) => o.isCurrent) || null;
  const activeTenant = tenants.find((t) => t.status === "active") || null;

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

  const handleCreateTenant = async (formData: FormData) => {
    setSaving(true);
    try {
      await createTenant(id, formData);
      toast.success("Tenant added");
      setTenantFormOpen(false);
      loadTenants();
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = async (form: VehicleFormData) => {
    setSaving(true);
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle._id, form);
        toast.success("Vehicle updated");
      } else {
        await createVehicle(form);
        toast.success("Vehicle added");
      }
      setVehicleFormOpen(false);
      setEditingVehicle(null);
      loadVehicles();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleDelete) return;
    setSaving(true);
    try {
      await deleteVehicle(vehicleDelete._id);
      toast.success("Vehicle deleted");
      setVehicleDelete(null);
      loadVehicles();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveMember = async (payload: FamilyMemberFormData) => {
    setSaving(true);
    try {
      if (editingMember) {
        await updateFamilyMember(editingMember._id, payload);
        toast.success("Member updated");
      } else {
        await createFamilyMember(id, payload);
        toast.success("Member added");
      }
      setFamilyFormOpen(false);
      setEditingMember(null);
      loadFamily();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberDelete) return;
    setSaving(true);
    try {
      await deleteFamilyMember(memberDelete._id);
      toast.success("Member deleted");
      setMemberDelete(null);
      loadFamily();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openDocModal = (doc: HouseDocument | null) => {
    setEditingDoc(doc);
    setDocFile(null);
    setDocForm({
      title: doc?.title || "",
      docType: doc?.docType || "other",
      notes: doc?.notes || "",
    });
    setDocModalOpen(true);
  };

  const onDocFile = (file: File | null) => {
    if (!file) {
      setDocFile(null);
      return;
    }
    if (!DOC_ALLOWED.includes(file.type)) {
      toast.error("Only jpeg, png, webp and pdf files are allowed");
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      toast.error("File must be 5 MB or smaller");
      return;
    }
    setDocFile(file);
  };

  const saveDocument = async () => {
    if (!id) return;
    if (!editingDoc && !docFile) {
      toast.error("Please choose a file");
      return;
    }
    setSaving(true);
    try {
      if (editingDoc) {
        await updateHouseDocument(editingDoc._id, {
          title: docForm.title.trim(),
          docType: docForm.docType,
          notes: docForm.notes.trim() || undefined,
        });
        toast.success("Document updated");
      } else {
        const fd = new FormData();
        fd.append("title", docForm.title.trim());
        fd.append("docType", docForm.docType);
        if (docForm.notes.trim()) fd.append("notes", docForm.notes.trim());
        if (docFile) fd.append("file", docFile);
        await uploadHouseDocument(id, fd);
        toast.success("Document uploaded");
      }
      setDocModalOpen(false);
      loadDocuments();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const viewDocument = async (doc: HouseDocument) => {
    try {
      await openHouseDocument(doc._id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDeleteDocument = async () => {
    if (!docDelete) return;
    setSaving(true);
    try {
      await deleteHouseDocument(docDelete._id);
      toast.success("Document deleted");
      setDocDelete(null);
      loadDocuments();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const tabs = ["owner", "tenant", "vehicles", "family", "documents"];
  const tabLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

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
          <p className="text-sm text-gray-500 capitalize">Maintenance payable by: {house.maintenancePayableBy}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditHouseOpen(true)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
            Edit
          </button>
          <button onClick={() => setDeleteOpen(true)} className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
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
              tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {tab === "owner" && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-5 shadow">
            {currentOwnerFull ? (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-medium">{currentOwnerFull.name}</p>
                    {currentOwnerFull.phone && <p className="text-sm text-gray-500">{currentOwnerFull.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditOwner(currentOwnerFull)} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
                      Edit
                    </button>
                    <button onClick={() => setTransferOpen(true)} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
                      Transfer Ownership
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                  {currentOwnerFull.altPhone && <p>Alt Phone: {currentOwnerFull.altPhone}</p>}
                  {currentOwnerFull.email && <p>Email: {currentOwnerFull.email}</p>}
                  {currentOwnerFull.idProofType && (
                    <p>
                      ID: {currentOwnerFull.idProofType} {currentOwnerFull.idProofNumber}
                    </p>
                  )}
                  <p>From: {formatDate(currentOwnerFull.fromDate)}</p>
                  {currentOwnerFull.emergencyContact?.name && (
                    <p className="sm:col-span-2">
                      Emergency: {currentOwnerFull.emergencyContact.name}
                      {currentOwnerFull.emergencyContact.phone ? ` · ${currentOwnerFull.emergencyContact.phone}` : ""}
                      {currentOwnerFull.emergencyContact.relation ? ` (${currentOwnerFull.emergencyContact.relation})` : ""}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-500">No owner assigned.</p>
                <button onClick={() => setAssignOpen(true)} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
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
                    <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ${o.isCurrent ? "bg-green-500" : "bg-gray-300"}`} />
                    <p className="font-medium">
                      {o.name}
                      {o.isCurrent && <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Current</span>}
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
      )}

      {tab === "tenant" && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current Tenant</h2>
              {!activeTenant && (
                <button onClick={() => setTenantFormOpen(true)} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
                  Mark as Rented
                </button>
              )}
            </div>
            {tenantsLoading ? (
              <Loader />
            ) : activeTenant ? (
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-medium">{activeTenant.name}</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${agreementColors[activeTenant.agreementState || "valid"]}`}>
                    {activeTenant.agreementState === "expiring_soon" ? "Expiring Soon" : activeTenant.agreementState === "expired" ? "Expired" : "Valid"}
                  </span>
                </div>
                {activeTenant.phone && <p className="text-sm text-gray-500">{activeTenant.phone}</p>}
                <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                  <p>Rent: {formatCurrency(activeTenant.rentAmount)}</p>
                  <p>Agreement End: {formatDate(activeTenant.agreementEndDate)}</p>
                  <p>Days Left: {activeTenant.daysLeft ?? 0}</p>
                </div>
                <button
                  onClick={() => navigate(`/admin/tenants/${activeTenant._id}`)}
                  className="mt-3 rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  View Details
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active tenant. Mark the house as rented to add one.</p>
            )}
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-3 text-lg font-semibold">Tenant History</h2>
            {tenantsLoading ? (
              <Loader />
            ) : tenants.length === 0 ? (
              <p className="text-sm text-gray-500">No tenants for this house yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Phone</th>
                      <th className="pb-2">Rent</th>
                      <th className="pb-2">Agreement End</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t._id} className="cursor-pointer border-b hover:bg-slate-50" onClick={() => navigate(`/admin/tenants/${t._id}`)}>
                        <td className="py-2 font-medium text-slate-900">{t.name}</td>
                        <td className="py-2">{t.phone || "-"}</td>
                        <td className="py-2">{formatCurrency(t.rentAmount)}</td>
                        <td className="py-2">{formatDate(t.agreementEndDate)}</td>
                        <td className="py-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${t.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                            {t.status === "active" ? "Active" : "Vacated"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "vehicles" && (
        <div className="rounded-lg bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Vehicles</h2>
            <button
              onClick={() => {
                setEditingVehicle(null);
                setVehicleFormOpen(true);
              }}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Add Vehicle
            </button>
          </div>
          {vehiclesLoading ? (
            <Loader />
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-gray-500">No vehicles registered for this house.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2">Vehicle No</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Make / Model</th>
                    <th className="pb-2">Owner</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v._id} className="border-b">
                      <td className="py-2 font-medium text-slate-900">{v.vehicleNo}</td>
                      <td className="py-2 capitalize">{v.type.replace("_", " ")}</td>
                      <td className="py-2">{[v.make, v.vehicleModel].filter(Boolean).join(" ") || "-"}</td>
                      <td className="py-2 capitalize">{v.ownerType}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingVehicle(v);
                              setVehicleFormOpen(true);
                            }}
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button onClick={() => setVehicleDelete(v)} className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "family" && (
        <div className="rounded-lg bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Family Members</h2>
            <button
              onClick={() => {
                setEditingMember(null);
                setFamilyFormOpen(true);
              }}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Add Member
            </button>
          </div>
          {familyLoading ? (
            <Loader />
          ) : family.length === 0 ? (
            <p className="text-sm text-gray-500">No family members added for this house.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Relation</th>
                    <th className="pb-2">Gender</th>
                    <th className="pb-2">Age / DOB</th>
                    <th className="pb-2">Phone</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {family.map((m) => (
                    <tr key={m._id} className="border-b">
                      <td className="py-2 font-medium text-slate-900">
                        <span className="flex items-center gap-2">
                          {m.name}
                          {m.isEmergencyContact && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">Emergency</span>
                          )}
                        </span>
                      </td>
                      <td className="py-2">{m.relation}</td>
                      <td className="py-2 capitalize">{m.gender}</td>
                      <td className="py-2">{m.age ? `${m.age} yrs` : m.dob ? formatDate(m.dob) : "-"}</td>
                      <td className="py-2">{m.phone || "-"}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setFamilyFormOpen(true);
                            }}
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button onClick={() => setMemberDelete(m)} className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "maintenance" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => navigate(`/admin/payments/new?houseId=${id}`)}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Record Payment
            </button>
          </div>
          {ledgerLoading ? (
            <Loader />
          ) : ledger ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-white p-4 shadow">
                  <p className="text-xs text-gray-500">Total Due</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(ledger.summary.totalDue)}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="mt-1 text-lg font-semibold text-green-600">{formatCurrency(ledger.summary.totalPaid)}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="mt-1 text-lg font-semibold text-amber-600">{formatCurrency(ledger.summary.outstanding)}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                  <p className="text-xs text-gray-500">Advance Credit</p>
                  <p className="mt-1 text-lg font-semibold text-blue-600">{formatCurrency(ledger.summary.advanceCredit)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-3 text-lg font-semibold">Dues</h2>
                {ledger.dues.length === 0 ? (
                  <p className="text-sm text-gray-500">No dues generated for this house.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="pb-2">Period</th>
                          <th className="pb-2">Due Date</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">Paid</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.dues.map((d) => (
                          <tr key={d._id} className="border-b">
                            <td className="py-2 font-medium text-slate-900">{d.periodLabel}</td>
                            <td className="py-2">{formatDate(d.dueDate)}</td>
                            <td className="py-2">{formatCurrency(d.amount)}</td>
                            <td className="py-2">{formatCurrency(d.paidPrincipal)}</td>
                            <td className="py-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">{d.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-3 text-lg font-semibold">Payments</h2>
                {ledger.payments.length === 0 ? (
                  <p className="text-sm text-gray-500">No payments recorded for this house.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="pb-2">Receipt</th>
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.payments.map((p) => (
                          <tr key={p._id} className="border-b">
                            <td className="py-2 font-medium text-slate-900">{p.receiptNo}</td>
                            <td className="py-2">{formatDate(p.paidOn)}</td>
                            <td className="py-2">{formatCurrency(p.amount)}</td>
                            <td className="py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  p.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No maintenance data.</p>
          )}
        </div>
      )}

      {tab === "share" && (
        <div className="rounded-lg bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Share</h2>
            <button
              onClick={() => navigate(`/admin/payments/new?kind=share&houseId=${id}`)}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Record share payment
            </button>
          </div>
          {shareLoading ? (
            <Loader />
          ) : shareRecord ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(shareRecord.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className="mt-1 text-lg font-semibold text-green-600">{formatCurrency(shareRecord.paidAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="mt-1 text-lg font-semibold text-amber-600">
                  {formatCurrency(shareRecord.totalAmount - shareRecord.paidAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="mt-1 text-sm capitalize">{shareRecord.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Certificate No</p>
                <p className="mt-1 text-sm">{shareRecord.certificateNo || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Issue Date</p>
                <p className="mt-1 text-sm">{shareRecord.issueDate ? formatDate(shareRecord.issueDate) : "-"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No share record for this house.</p>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="rounded-lg bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Documents</h2>
            <button
              onClick={() => openDocModal(null)}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Upload document
            </button>
          </div>
          {documentsLoading ? (
            <Loader />
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2">Title</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">File</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Uploaded</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d._id} className="border-b">
                      <td className="py-2 font-medium text-slate-900">{d.title}</td>
                      <td className="py-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">
                          {docTypeLabel(d.docType)}
                        </span>
                      </td>
                      <td className="py-2 max-w-[200px] truncate text-slate-600">{d.originalName}</td>
                      <td className="py-2">{formatSize(d.size)}</td>
                      <td className="py-2">{formatDate(d.createdAt)}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewDocument(d)}
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openDocModal(d)}
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDocDelete(d)}
                            className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        open={docModalOpen}
        title={editingDoc ? "Edit Document" : "Upload Document"}
        onClose={() => setDocModalOpen(false)}
        footer={
          <>
            <button onClick={() => setDocModalOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={saveDocument}
              disabled={saving || !docForm.title.trim()}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingDoc ? "Save" : "Upload"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <input
              value={docForm.title}
              onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              value={docForm.docType}
              onChange={(e) => setDocForm({ ...docForm, docType: e.target.value as HouseDocumentType })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={docForm.notes}
              onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
              rows={3}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          {!editingDoc && (
            <div>
              <label className="mb-1 block text-sm font-medium">File * (jpeg/png/webp/pdf, max 5 MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => onDocFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
              {docFile && <p className="mt-1 text-xs text-gray-500">Selected: {docFile.name}</p>}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!docDelete}
        title="Delete Document"
        message={`Delete "${docDelete?.title}"?`}
        loading={saving}
        onConfirm={confirmDeleteDocument}
        onCancel={() => setDocDelete(null)}
        confirmVariant="danger"
      />

      <OwnerFormModal open={assignOpen} mode="assign" loading={saving} onClose={() => setAssignOpen(false)} onSubmit={saveOwner} />
      <OwnerFormModal open={!!editOwner} mode="edit" initial={editOwner} loading={saving} onClose={() => setEditOwner(null)} onSubmit={saveOwner} />
      <TransferOwnershipModal open={transferOpen} loading={saving} onClose={() => setTransferOpen(false)} onSubmit={doTransfer} />

      <TenantForm open={tenantFormOpen} mode="create" loading={saving} onClose={() => setTenantFormOpen(false)} onSubmit={handleCreateTenant} />

      <VehicleFormModal
        open={vehicleFormOpen}
        mode={editingVehicle ? "edit" : "create"}
        initial={editingVehicle}
        houses={[house]}
        defaultHouseId={house._id}
        loading={saving}
        onClose={() => {
          setVehicleFormOpen(false);
          setEditingVehicle(null);
        }}
        onSubmit={saveVehicle}
      />

      <FamilyFormModal
        open={familyFormOpen}
        mode={editingMember ? "edit" : "create"}
        initial={editingMember}
        loading={saving}
        onClose={() => {
          setFamilyFormOpen(false);
          setEditingMember(null);
        }}
        onSubmit={saveMember}
      />

      <Modal
        open={editHouseOpen}
        title="Edit House"
        onClose={() => setEditHouseOpen(false)}
        footer={
          <>
            <button onClick={() => setEditHouseOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={saveHouse} disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60">
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
                onChange={(e) => setHouseForm({ ...houseForm, occupancyStatus: e.target.value as OccupancyStatus })}
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
                onChange={(e) => setHouseForm({ ...houseForm, maintenancePayableBy: e.target.value as MaintenancePayableBy })}
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
      <ConfirmDialog
        open={!!vehicleDelete}
        title="Delete Vehicle"
        message={`Delete vehicle ${vehicleDelete?.vehicleNo}?`}
        loading={saving}
        onConfirm={confirmDeleteVehicle}
        onCancel={() => setVehicleDelete(null)}
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={!!memberDelete}
        title="Delete Family Member"
        message={`Delete ${memberDelete?.name}?`}
        loading={saving}
        onConfirm={confirmDeleteMember}
        onCancel={() => setMemberDelete(null)}
        confirmVariant="danger"
      />
    </div>
  );
}