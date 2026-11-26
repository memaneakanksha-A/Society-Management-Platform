import api from "./axios";
import type {
  HomeData,
  PublicSociety,
  Banner,
  BodyMember,
  GalleryAlbum,
  AlbumDetail,
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