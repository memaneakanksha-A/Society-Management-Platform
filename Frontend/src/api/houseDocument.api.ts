import api from "./axios";
import { openBlobInNewTab } from "./tenant.api";

export type HouseDocumentType =
  | "sale_deed"
  | "share_certificate"
  | "noc"
  | "id_proof"
  | "tax_bill"
  | "electricity_bill"
  | "other";

export interface HouseDocument {
  _id: string;
  houseId: string;
  title: string;
  docType: HouseDocumentType;
  file: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
  notes?: string;
  status: "active" | "deleted";
  createdAt: string;
  updatedAt: string;
}

export interface HouseDocumentPayload {
  title?: string;
  docType?: HouseDocumentType;
  notes?: string;
}

export const listHouseDocuments = async (houseId: string): Promise<HouseDocument[]> => {
  const { data } = await api.get(`/admin/houses/${houseId}/documents`);
  return data.documents as HouseDocument[];
};

export const uploadHouseDocument = async (
  houseId: string,
  form: FormData
): Promise<HouseDocument> => {
  const { data } = await api.post(`/admin/houses/${houseId}/documents`, form);
  return data.document as HouseDocument;
};

export const updateHouseDocument = async (
  id: string,
  payload: HouseDocumentPayload
): Promise<HouseDocument> => {
  const { data } = await api.put(`/admin/house-documents/${id}`, payload);
  return data.document as HouseDocument;
};

export const deleteHouseDocument = async (id: string): Promise<void> => {
  await api.delete(`/admin/house-documents/${id}`);
};

export const getHouseDocumentBlob = async (id: string): Promise<Blob> => {
  const { data } = await api.get(`/admin/house-documents/${id}/file`, {
    responseType: "blob",
  });
  return data as Blob;
};

export const openHouseDocument = async (id: string): Promise<void> => {
  const blob = await getHouseDocumentBlob(id);
  openBlobInNewTab(blob);
};