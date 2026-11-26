export interface Society {
  _id: string;
  name: string;
  slug: string;
  address?: string;
  totalHouses: number;
  about?: string;
  contact?: { phone?: string; email?: string; mapUrl?: string };
  officeTime?: string;
  status: "active" | "inactive";
  createdAt?: string;
}

export interface SocietyFormData {
  name: string;
  slug: string;
  address: string;
  totalHouses: number;
  phone: string;
  email: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}