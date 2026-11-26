import api from "./axios";
import type {
  Banner,
  BodyMember,
  GalleryAlbum,
  GalleryImage,
  SocietySettings,
} from "@/types/content.types";

export const getBanners = async (): Promise<Banner[]> => {
  const { data } = await api.get("/admin/banners");
  return data.banners as Banner[];
};

export const createBanner = async (form: FormData): Promise<Banner> => {
  const { data } = await api.post("/admin/banners", form);
  return data.banner as Banner;
};

export const updateBanner = async (id: string, form: FormData): Promise<Banner> => {
  const { data } = await api.put(`/admin/banners/${id}`, form);
  return data.banner as Banner;
};

export const deleteBanner = async (id: string): Promise<void> => {
  await api.delete(`/admin/banners/${id}`);
};

export const getBodyMembers = async (): Promise<BodyMember[]> => {
  const { data } = await api.get("/admin/members");
  return data.members as BodyMember[];
};

export const createBodyMember = async (form: FormData): Promise<BodyMember> => {
  const { data } = await api.post("/admin/members", form);
  return data.member as BodyMember;
};

export const updateBodyMember = async (id: string, form: FormData): Promise<BodyMember> => {
  const { data } = await api.put(`/admin/members/${id}`, form);
  return data.member as BodyMember;
};

export const deleteBodyMember = async (id: string): Promise<void> => {
  await api.delete(`/admin/members/${id}`);
};

export const getAlbums = async (): Promise<GalleryAlbum[]> => {
  const { data } = await api.get("/admin/gallery/albums");
  return data.albums as GalleryAlbum[];
};

export const createAlbum = async (form: FormData): Promise<GalleryAlbum> => {
  const { data } = await api.post("/admin/gallery/albums", form);
  return data.album as GalleryAlbum;
};

export const updateAlbum = async (id: string, form: FormData): Promise<GalleryAlbum> => {
  const { data } = await api.put(`/admin/gallery/albums/${id}`, form);
  return data.album as GalleryAlbum;
};

export const deleteAlbum = async (id: string): Promise<void> => {
  await api.delete(`/admin/gallery/albums/${id}`);
};

export const getAlbumImages = async (albumId: string): Promise<GalleryImage[]> => {
  const { data } = await api.get(`/admin/gallery/albums/${albumId}/images`);
  return data.images as GalleryImage[];
};

export const uploadAlbumImages = async (
  albumId: string,
  files: File[]
): Promise<GalleryImage[]> => {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  const { data } = await api.post(`/admin/gallery/albums/${albumId}/images`, form);
  return data.images as GalleryImage[];
};

export const deleteGalleryImage = async (imageId: string): Promise<void> => {
  await api.delete(`/admin/gallery/images/${imageId}`);
};

export const getSettings = async (): Promise<SocietySettings> => {
  const { data } = await api.get("/admin/settings");
  return data.settings as SocietySettings;
};

export const updateSettings = async (payload: {
  address?: string;
  about?: string;
  officeTime?: string;
  contact?: { phone?: string; email?: string; mapUrl?: string };
}): Promise<SocietySettings> => {
  const { data } = await api.put("/admin/settings", payload);
  return data.settings as SocietySettings;
};

export const uploadLogo = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("logo", file);
  const { data } = await api.post("/admin/settings/logo", form);
  return data.logo as string;
};