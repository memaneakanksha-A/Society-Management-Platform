export interface SocietyContact {
  phone?: string;
  email?: string;
  mapUrl?: string;
}

export interface PublicSociety {
  name: string;
  slug: string;
  address?: string;
  logo?: string;
  about?: string;
  contact?: SocietyContact;
  officeTime?: string;
}

export interface Banner {
  title: string;
  subtitle?: string;
  image: string;
}

export interface BodyMember {
  name: string;
  designation: string;
  photo?: string;
  phone?: string;
  email?: string;
}

export interface HomeData {
  society: PublicSociety;
  banners: Banner[];
  members: BodyMember[];
  news: PublicNews[];
  events: PublicEvent[];
  meetings: PublicMeeting[];
  notices: PublicNotice[];
}

export interface PublicNews {
  _id: string;
  title: string;
  summary?: string;
  body?: string;
  image?: string;
  date: string;
  isPinned?: boolean;
}

export interface PublicEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  time?: string;
  venue?: string;
  image?: string;
}

export type PublicMeetingType = "general_body" | "committee" | "agm" | "special";
export type PublicMeetingStatus = "upcoming" | "completed" | "cancelled";

export interface PublicMeeting {
  _id: string;
  title: string;
  type: PublicMeetingType;
  date: string;
  time?: string;
  venue?: string;
  agenda?: string;
  status: PublicMeetingStatus;
  minutes?: string;
  minutesFile?: string;
  attendeesCount: number;
}

export type PublicNoticeCategory =
  | "general"
  | "maintenance"
  | "water"
  | "security"
  | "legal"
  | "event"
  | "other";

export interface PublicNotice {
  _id: string;
  title: string;
  body?: string;
  category: PublicNoticeCategory;
  attachment?: string;
  isImportant: boolean;
  publishOn?: string;
  expiresOn?: string;
}

export interface PublicList<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface GalleryAlbum {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  imageCount: number;
}

export interface GalleryImage {
  _id: string;
  imageUrl: string;
  caption?: string;
}

export interface AlbumDetail {
  album: {
    _id: string;
    title: string;
    description?: string;
    coverImage?: string;
  };
  images: GalleryImage[];
}