import api from "./axios";
import type { AxiosProgressEvent } from "axios";
import type {
  Banner,
  BodyMember,
  GalleryAlbum,
  GalleryImage,
  SocietySettings,
  News,
  EventItem,
  Meeting,
  Notice,
  Paginated,
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
  files: File[],
  onProgress?: (percent: number) => void
): Promise<GalleryImage[]> => {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  const { data } = await api.post(`/admin/gallery/albums/${albumId}/images`, form, {
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
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

export interface ContentQuery {
  search?: string;
  published?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

// ---------- News ----------

export const getNews = async (q: ContentQuery): Promise<Paginated<News>> => {
  const { data } = await api.get("/admin/news", { params: q });
  return { items: data.news, total: data.total, page: data.page, pages: data.pages };
};

export const createNews = async (form: FormData): Promise<News> => {
  const { data } = await api.post("/admin/news", form);
  return data.news as News;
};

export const updateNews = async (id: string, form: FormData): Promise<News> => {
  const { data } = await api.put(`/admin/news/${id}`, form);
  return data.news as News;
};

export const deleteNews = async (id: string): Promise<void> => {
  await api.delete(`/admin/news/${id}`);
};

export const toggleNewsPublish = async (id: string, isPublished: boolean): Promise<News> => {
  const { data } = await api.patch(`/admin/news/${id}/publish`, { isPublished });
  return data.news as News;
};

// ---------- Events ----------

export const getEvents = async (q: ContentQuery): Promise<Paginated<EventItem>> => {
  const { data } = await api.get("/admin/events", { params: q });
  return { items: data.events, total: data.total, page: data.page, pages: data.pages };
};

export const createEvent = async (form: FormData): Promise<EventItem> => {
  const { data } = await api.post("/admin/events", form);
  return data.event as EventItem;
};

export const updateEvent = async (id: string, form: FormData): Promise<EventItem> => {
  const { data } = await api.put(`/admin/events/${id}`, form);
  return data.event as EventItem;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/admin/events/${id}`);
};

export const toggleEventPublish = async (id: string, isPublished: boolean): Promise<EventItem> => {
  const { data } = await api.patch(`/admin/events/${id}/publish`, { isPublished });
  return data.event as EventItem;
};

// ---------- Meetings ----------

export const getMeetings = async (q: ContentQuery): Promise<Paginated<Meeting>> => {
  const { data } = await api.get("/admin/meetings", { params: q });
  return { items: data.meetings, total: data.total, page: data.page, pages: data.pages };
};

export const createMeeting = async (form: FormData): Promise<Meeting> => {
  const { data } = await api.post("/admin/meetings", form);
  return data.meeting as Meeting;
};

export const updateMeeting = async (id: string, form: FormData): Promise<Meeting> => {
  const { data } = await api.put(`/admin/meetings/${id}`, form);
  return data.meeting as Meeting;
};

export const updateMeetingMinutes = async (id: string, form: FormData): Promise<Meeting> => {
  const { data } = await api.put(`/admin/meetings/${id}/minutes`, form);
  return data.meeting as Meeting;
};

export const deleteMeeting = async (id: string): Promise<void> => {
  await api.delete(`/admin/meetings/${id}`);
};

export const toggleMeetingPublish = async (id: string, isPublished: boolean): Promise<Meeting> => {
  const { data } = await api.patch(`/admin/meetings/${id}/publish`, { isPublished });
  return data.meeting as Meeting;
};

// ---------- Notices ----------

export const getNotices = async (q: ContentQuery): Promise<Paginated<Notice>> => {
  const { data } = await api.get("/admin/notices", { params: q });
  return { items: data.notices, total: data.total, page: data.page, pages: data.pages };
};

export const createNotice = async (form: FormData): Promise<Notice> => {
  const { data } = await api.post("/admin/notices", form);
  return data.notice as Notice;
};

export const updateNotice = async (id: string, form: FormData): Promise<Notice> => {
  const { data } = await api.put(`/admin/notices/${id}`, form);
  return data.notice as Notice;
};

export const deleteNotice = async (id: string): Promise<void> => {
  await api.delete(`/admin/notices/${id}`);
};

export const toggleNoticePublish = async (id: string, isPublished: boolean): Promise<Notice> => {
  const { data } = await api.patch(`/admin/notices/${id}/publish`, { isPublished });
  return data.notice as Notice;
};