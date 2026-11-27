import api, { getErrorMessage } from "./axios";
import type {
  MemberMeResponse,
  MemberDashboard,
  MemberDuesResponse,
  MemberPayment,
  MemberNotice,
  MemberMeeting,
  MemberEvent,
  FamilyMember,
  MemberVehicle,
  MemberLoginListResponse,
  BulkCreateLoginResult,
  Complaint,
  ComplaintListResponse,
  ServiceRequest,
  ServiceRequestListResponse,
} from "@/types/member.types";

export { getErrorMessage };

export const getMe = async (): Promise<MemberMeResponse> => {
  const { data } = await api.get("/member/me");
  return data as MemberMeResponse;
};

export const getDashboard = async (): Promise<MemberDashboard> => {
  const { data } = await api.get("/member/dashboard");
  return data as MemberDashboard;
};

export const getDues = async (year?: string): Promise<MemberDuesResponse> => {
  const { data } = await api.get("/member/dues", { params: year ? { year } : undefined });
  return data as MemberDuesResponse;
};

export const getPayments = async (): Promise<MemberPayment[]> => {
  const { data } = await api.get("/member/payments");
  return data.payments as MemberPayment[];
};

export const openPaymentReceipt = async (id: string): Promise<void> => {
  const res = await api.get(`/member/payments/${id}/receipt`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const getNotices = async (): Promise<MemberNotice[]> => {
  const { data } = await api.get("/member/notices");
  return data.notices as MemberNotice[];
};

export const getMeetings = async (): Promise<MemberMeeting[]> => {
  const { data } = await api.get("/member/meetings");
  return data.meetings as MemberMeeting[];
};

export const getEvents = async (): Promise<MemberEvent[]> => {
  const { data } = await api.get("/member/events");
  return data.events as MemberEvent[];
};

export const getFamily = async (): Promise<FamilyMember[]> => {
  const { data } = await api.get("/member/family");
  return data.members as FamilyMember[];
};

export const createFamily = async (payload: Partial<FamilyMember>): Promise<FamilyMember> => {
  const { data } = await api.post("/member/family", payload);
  return data.member as FamilyMember;
};

export const updateFamily = async (id: string, payload: Partial<FamilyMember>): Promise<FamilyMember> => {
  const { data } = await api.put(`/member/family/${id}`, payload);
  return data.member as FamilyMember;
};

export const deleteFamily = async (id: string): Promise<void> => {
  await api.delete(`/member/family/${id}`);
};

export const getVehicles = async (): Promise<MemberVehicle[]> => {
  const { data } = await api.get("/member/vehicles");
  return data.vehicles as MemberVehicle[];
};

export const createVehicle = async (payload: Partial<MemberVehicle>): Promise<MemberVehicle> => {
  const { data } = await api.post("/member/vehicles", payload);
  return data.vehicle as MemberVehicle;
};

export const updateVehicle = async (id: string, payload: Partial<MemberVehicle>): Promise<MemberVehicle> => {
  const { data } = await api.put(`/member/vehicles/${id}`, payload);
  return data.vehicle as MemberVehicle;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await api.delete(`/member/vehicles/${id}`);
};

/* ---------------- admin: member logins ---------------- */

export const getMemberLogins = async (params: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}): Promise<MemberLoginListResponse> => {
  const { data } = await api.get("/admin/member-logins", { params });
  return data as MemberLoginListResponse;
};

export const createMemberLogin = async (
  houseId: string,
  forWho: "owner" | "tenant"
): Promise<{ tempPassword: string; user: { id: string; name: string } }> => {
  const { data } = await api.post(`/admin/houses/${houseId}/member-login`, { for: forWho });
  return data as { tempPassword: string; user: { id: string; name: string } };
};

export const bulkCreateMemberLogins = async (
  forWho: "owner"
): Promise<{ created: BulkCreateLoginResult[]; skipped: number }> => {
  const { data } = await api.post("/admin/member-logins/bulk-create", { for: forWho });
  return data as { created: BulkCreateLoginResult[]; skipped: number };
};

export const resetMemberPassword = async (userId: string): Promise<string> => {
  const { data } = await api.post(`/admin/member-logins/${userId}/reset-password`);
  return (data as { tempPassword: string }).tempPassword;
};

export const setMemberLoginStatus = async (
  userId: string,
  isActive: boolean
): Promise<void> => {
  await api.patch(`/admin/member-logins/${userId}/status`, { isActive });
};
/* ---------------- complaints & service requests ---------------- */

const openBlob = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const raiseComplaint = async (form: FormData): Promise<Complaint> => {
  const { data } = await api.post("/member/complaints", form);
  return data.complaint as Complaint;
};

export const getMyComplaints = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ComplaintListResponse> => {
  const { data } = await api.get("/member/complaints", { params });
  return data as ComplaintListResponse;
};

export const getMyComplaint = async (id: string): Promise<Complaint> => {
  const { data } = await api.get(`/member/complaints/${id}`);
  return data.complaint as Complaint;
};

export const commentMyComplaint = async (id: string, note: string): Promise<void> => {
  await api.post(`/member/complaints/${id}/comments`, { note });
};

export const openMyComplaintPhoto = async (id: string, filename: string): Promise<void> => {
  const res = await api.get(`/member/complaints/${id}/photos/${filename}`, { responseType: "blob" });
  openBlob(res.data as Blob);
};

export const requestService = async (payload: {
  type: string;
  purpose: string;
  details?: string;
}): Promise<ServiceRequest> => {
  const { data } = await api.post("/member/service-requests", payload);
  return data.request as ServiceRequest;
};

export const getMyServiceRequests = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ServiceRequestListResponse> => {
  const { data } = await api.get("/member/service-requests", { params });
  return data as ServiceRequestListResponse;
};

export const openMyServiceDocument = async (id: string): Promise<void> => {
  const res = await api.get(`/member/service-requests/${id}/document`, { responseType: "blob" });
  openBlob(res.data as Blob);
};

/* ---------------- admin: complaints ---------------- */

export const getComplaints = async (params: {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ComplaintListResponse> => {
  const { data } = await api.get("/admin/complaints", { params });
  return data as ComplaintListResponse;
};

export const getComplaint = async (id: string): Promise<Complaint> => {
  const { data } = await api.get(`/admin/complaints/${id}`);
  return data.complaint as Complaint;
};

export const updateComplaint = async (
  id: string,
  payload: { status?: string; assignedTo?: string; priority?: string; note?: string }
): Promise<void> => {
  await api.patch(`/admin/complaints/${id}`, payload);
};

export const commentComplaint = async (id: string, note: string): Promise<void> => {
  await api.post(`/admin/complaints/${id}/comments`, { note });
};

export const createComplaintAdmin = async (form: FormData): Promise<Complaint> => {
  const { data } = await api.post("/admin/complaints", form);
  return data.complaint as Complaint;
};

export const openComplaintPhotoAdmin = async (id: string, filename: string): Promise<void> => {
  const res = await api.get(`/admin/complaints/${id}/photos/${filename}`, { responseType: "blob" });
  openBlob(res.data as Blob);
};

/* ---------------- admin: service requests ---------------- */

export const getServiceRequests = async (params: {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ServiceRequestListResponse> => {
  const { data } = await api.get("/admin/service-requests", { params });
  return data as ServiceRequestListResponse;
};

export const getServiceRequest = async (id: string): Promise<ServiceRequest> => {
  const { data } = await api.get(`/admin/service-requests/${id}`);
  return data.request as ServiceRequest;
};

export const updateServiceRequest = async (
  id: string,
  payload: { status?: string; adminRemarks?: string }
): Promise<void> => {
  await api.patch(`/admin/service-requests/${id}`, payload);
};

export const issueServiceRequest = async (id: string): Promise<void> => {
  await api.post(`/admin/service-requests/${id}/issue`);
};

export const openServiceDocumentAdmin = async (id: string): Promise<void> => {
  const res = await api.get(`/admin/service-requests/${id}/document`, { responseType: "blob" });
  openBlob(res.data as Blob);
};
