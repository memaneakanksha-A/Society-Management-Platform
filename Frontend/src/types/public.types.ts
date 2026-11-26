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