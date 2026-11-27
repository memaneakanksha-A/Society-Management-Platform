export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  order: number;
  isActive: boolean;
}

export interface BodyMember {
  _id: string;
  name: string;
  designation: string;
  photo?: string;
  phone?: string;
  email?: string;
  order: number;
  isActive: boolean;
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

export interface SocietySettings {
  name: string;
  slug: string;
  address?: string;
  logo?: string;
  about?: string;
  contact?: {
    phone?: string;
    email?: string;
    mapUrl?: string;
  };
  officeTime?: string;
}

export interface News {
  _id: string;
  title: string;
  summary?: string;
  body?: string;
  image?: string;
  date: string;
  isPublished: boolean;
  isPinned: boolean;
  createdAt?: string;
}

export interface EventItem {
  _id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  time?: string;
  venue?: string;
  image?: string;
  isPublished: boolean;
  createdAt?: string;
}

export type MeetingType = "general_body" | "committee" | "agm" | "special";
export type MeetingStatus = "upcoming" | "completed" | "cancelled";

export interface Meeting {
  _id: string;
  title: string;
  type: MeetingType;
  date: string;
  time?: string;
  venue?: string;
  agenda?: string;
  status: MeetingStatus;
  minutes?: string;
  minutesFile?: string;
  attendeesCount: number;
  isPublished: boolean;
  createdAt?: string;
}

export type NoticeCategory =
  | "general"
  | "maintenance"
  | "water"
  | "security"
  | "legal"
  | "event"
  | "other";
export type NoticeVisibility = "public" | "members";

export interface Notice {
  _id: string;
  title: string;
  body?: string;
  category: NoticeCategory;
  attachment?: string;
  isImportant: boolean;
  publishOn?: string;
  expiresOn?: string;
  visibility: NoticeVisibility;
  isPublished: boolean;
  createdAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}