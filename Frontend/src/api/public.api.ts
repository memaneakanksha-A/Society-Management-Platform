import api from "./axios";
import type {
  HomeData,
  PublicSociety,
  Banner,
  BodyMember,
  GalleryAlbum,
  AlbumDetail,
  PublicNews,
  PublicEvent,
  PublicMeeting,
  PublicNotice,
  PublicList,
} from "@/types/public.types";

export const getHome = async (slug: string): Promise<HomeData> => {
  const { data } = await api.get(`/public/${slug}/home`);
  return data as HomeData;
};

export const getSociety = async (slug: string): Promise<PublicSociety> => {
  const { data } = await api.get(`/public/${slug}`);
  return data.society as PublicSociety;
};

export const getBanners = async (slug: string): Promise<Banner[]> => {
  const { data } = await api.get(`/public/${slug}/banners`);
  return data.banners as Banner[];
};

export const getMembers = async (slug: string): Promise<BodyMember[]> => {
  const { data } = await api.get(`/public/${slug}/members`);
  return data.members as BodyMember[];
};

export const getGallery = async (slug: string): Promise<GalleryAlbum[]> => {
  const { data } = await api.get(`/public/${slug}/gallery`);
  return data.albums as GalleryAlbum[];
};

export const getAlbum = async (slug: string, albumId: string): Promise<AlbumDetail> => {
  const { data } = await api.get(`/public/${slug}/gallery/${albumId}`);
  return data as AlbumDetail;
};

export const getPublicNews = async (
  slug: string,
  page = 1
): Promise<PublicList<PublicNews>> => {
  const { data } = await api.get(`/public/${slug}/news`, { params: { page } });
  return { items: data.news, total: data.total, page: data.page, pages: data.pages };
};

export const getPublicNewsItem = async (slug: string, id: string): Promise<PublicNews> => {
  const { data } = await api.get(`/public/${slug}/news/${id}`);
  return data.news as PublicNews;
};

export const getPublicEvents = async (
  slug: string,
  page = 1
): Promise<PublicList<PublicEvent>> => {
  const { data } = await api.get(`/public/${slug}/events`, { params: { page } });
  return { items: data.events, total: data.total, page: data.page, pages: data.pages };
};

export const getPublicMeetings = async (
  slug: string,
  page = 1
): Promise<PublicList<PublicMeeting>> => {
  const { data } = await api.get(`/public/${slug}/meetings`, { params: { page } });
  return { items: data.meetings, total: data.total, page: data.page, pages: data.pages };
};

export const getPublicNotices = async (
  slug: string,
  page = 1
): Promise<PublicList<PublicNotice>> => {
  const { data } = await api.get(`/public/${slug}/notices`, { params: { page } });
  return { items: data.notices, total: data.total, page: data.page, pages: data.pages };
};