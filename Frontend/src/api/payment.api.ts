import api from "./axios";
import type { Payment, PaymentInput, PaymentListResponse } from "@/types/maintenance.types";

export interface PaymentQuery {
  from?: string;
  to?: string;
  mode?: string;
  houseId?: string;
  kind?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const recordPayment = async (payload: PaymentInput): Promise<Payment> => {
  const { data } = await api.post("/admin/payments", payload);
  return data.payment as Payment;
};

export const getPayments = async (query: PaymentQuery): Promise<PaymentListResponse> => {
  const { data } = await api.get("/admin/payments", { params: query });
  return data as PaymentListResponse;
};

export const getPayment = async (id: string): Promise<Payment> => {
  const { data } = await api.get(`/admin/payments/${id}`);
  return data.payment as Payment;
};

export const cancelPayment = async (id: string, reason: string): Promise<Payment> => {
  const { data } = await api.post(`/admin/payments/${id}/cancel`, { reason });
  return data.payment as Payment;
};

export const getPaymentReceiptBlob = async (id: string): Promise<Blob> => {
  const { data } = await api.get(`/admin/payments/${id}/receipt`, { responseType: "blob" });
  return data as Blob;
};

export const openBlobInNewTab = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};