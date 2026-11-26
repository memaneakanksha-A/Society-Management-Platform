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