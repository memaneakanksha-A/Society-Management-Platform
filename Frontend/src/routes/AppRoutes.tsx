import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute, { homeForRole } from "./ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import PanelLayout from "@/layouts/PanelLayout";
import Login from "@/pages/Login";
import SuperAdminDashboard from "@/pages/superadmin/Dashboard";
import SocietyList from "@/pages/superadmin/SocietyList";
import SocietyForm from "@/pages/superadmin/SocietyForm";
import AdminDashboard from "@/pages/admin/Dashboard";
import HouseTypes from "@/pages/admin/houses/HouseTypes";
import HouseList from "@/pages/admin/houses/HouseList";
import HouseBulkCreate from "@/pages/admin/houses/HouseBulkCreate";
import HouseDetail from "@/pages/admin/houses/HouseDetail";
import BannerManage from "@/pages/admin/website/BannerManage";
import BodyMembersManage from "@/pages/admin/website/BodyMembersManage";
import GalleryManage from "@/pages/admin/website/GalleryManage";
import AboutManage from "@/pages/admin/website/AboutManage";
import ContactOfficeManage from "@/pages/admin/website/ContactOfficeManage";
import PublicLayout from "@/layouts/PublicLayout";
import PublicHome from "@/pages/public/Home";
import PublicAbout from "@/pages/public/About";
import PublicBodyMembers from "@/pages/public/BodyMembers";
import PublicGallery from "@/pages/public/Gallery";
import PublicContact from "@/pages/public/Contact";

const superAdminLinks = [
  { to: "/superadmin", label: "Dashboard", end: true },
  { to: "/superadmin/societies", label: "Societies" },
];

const adminLinks = [
  { to: "/admin", label: "Dashboard", end: true, section: "Society" },
  { to: "/admin/houses", label: "Houses", section: "Society" },
  { to: "/admin/houses/bulk", label: "Bulk Create Houses", section: "Society" },
  { to: "/admin/house-types", label: "House Types", section: "Society" },
  { to: "/admin/website/banners", label: "Banners", section: "Website" },
  { to: "/admin/website/members", label: "Body Members", section: "Website" },
  { to: "/admin/website/gallery", label: "Gallery", section: "Website" },
  { to: "/admin/website/about", label: "About", section: "Website" },
  { to: "/admin/website/contact", label: "Contact & Office Time", section: "Website" },
];

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? homeForRole(user.role) : "/login"} replace />}
      />
      <Route path="/login" element={<Login />} />

      <Route element={<PublicLayout />}>
        <Route path="/s/:slug" element={<PublicHome />} />
        <Route path="/s/:slug/about" element={<PublicAbout />} />
        <Route path="/s/:slug/members" element={<PublicBodyMembers />} />
        <Route path="/s/:slug/gallery" element={<PublicGallery />} />
        <Route path="/s/:slug/gallery/:albumId" element={<PublicGallery />} />
        <Route path="/s/:slug/contact" element={<PublicContact />} />
      </Route>

      <Route element={<ProtectedRoute allow={["superadmin"]} />}>
        <Route element={<PanelLayout title="Super Admin" links={superAdminLinks} />}>
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/societies" element={<SocietyList />} />
          <Route path="/superadmin/societies/new" element={<SocietyForm />} />
          <Route path="/superadmin/societies/:id/edit" element={<SocietyForm />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["admin"]} />}>
        <Route element={<PanelLayout title="Society Admin" links={adminLinks} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/houses" element={<HouseList />} />
          <Route path="/admin/houses/bulk" element={<HouseBulkCreate />} />
          <Route path="/admin/houses/:id" element={<HouseDetail />} />
          <Route path="/admin/house-types" element={<HouseTypes />} />
          <Route path="/admin/website/banners" element={<BannerManage />} />
          <Route path="/admin/website/members" element={<BodyMembersManage />} />
          <Route path="/admin/website/gallery" element={<GalleryManage />} />
          <Route path="/admin/website/about" element={<AboutManage />} />
          <Route path="/admin/website/contact" element={<ContactOfficeManage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}