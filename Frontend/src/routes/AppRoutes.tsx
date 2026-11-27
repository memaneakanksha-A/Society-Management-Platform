import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute, { homeForRole } from "./ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import AdminPanel from "@/layouts/AdminPanel";
import MemberLayout from "@/layouts/MemberLayout";
import SuperAdminPanel from "@/layouts/SuperAdminPanel";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import SuperAdminDashboard from "@/pages/superadmin/Dashboard";
import SocietyList from "@/pages/superadmin/SocietyList";
import SocietyForm from "@/pages/superadmin/SocietyForm";
import AdminDashboard from "@/pages/admin/Dashboard";
import HouseTypes from "@/pages/admin/houses/HouseTypes";
import HouseList from "@/pages/admin/houses/HouseList";
import HouseBulkCreate from "@/pages/admin/houses/HouseBulkCreate";
import HouseDetail from "@/pages/admin/houses/HouseDetail";
import MaintenanceSetup from "@/pages/admin/maintenance/MaintenanceSetup";
import DuesList from "@/pages/admin/maintenance/DuesList";
import RecordPayment from "@/pages/admin/maintenance/RecordPayment";
import Payments from "@/pages/admin/maintenance/Payments";
import ShareStatus from "@/pages/admin/shares/ShareStatus";
import ReportsIndex from "@/pages/admin/reports/ReportsIndex";
import PendingReport from "@/pages/admin/reports/PendingReport";
import Defaulters from "@/pages/admin/reports/Defaulters";
import CollectionReport from "@/pages/admin/reports/CollectionReport";
import TopPayers from "@/pages/admin/reports/TopPayers";
import Expenses from "@/pages/admin/expenses/Expenses";
import ExpenseCategories from "@/pages/admin/expenses/ExpenseCategories";
import Incomes from "@/pages/admin/expenses/Incomes";
import IncomeExpense from "@/pages/admin/reports/IncomeExpense";
import TenantList from "@/pages/admin/tenants/TenantList";
import TenantDetail from "@/pages/admin/tenants/TenantDetail";
import VehicleList from "@/pages/admin/vehicles/VehicleList";
import BannerManage from "@/pages/admin/website/BannerManage";
import BodyMembersManage from "@/pages/admin/website/BodyMembersManage";
import GalleryManage from "@/pages/admin/website/GalleryManage";
import AlbumDetail from "@/pages/admin/website/AlbumDetail";
import AboutManage from "@/pages/admin/website/AboutManage";
import ContactOfficeManage from "@/pages/admin/website/ContactOfficeManage";
import NewsManage from "@/pages/admin/content/NewsManage";
import EventsManage from "@/pages/admin/content/EventsManage";
import MeetingsManage from "@/pages/admin/content/MeetingsManage";
import NoticesManage from "@/pages/admin/content/NoticesManage";
import MemberLogins from "@/pages/admin/members/MemberLogins";
import ComplaintList from "@/pages/admin/complaints/ComplaintList";
import ServiceRequestList from "@/pages/admin/service-requests/ServiceRequestList";
import MyDashboard from "@/pages/member/MyDashboard";
import MyDues from "@/pages/member/MyDues";
import MyReceipts from "@/pages/member/MyReceipts";
import MemberNotices from "@/pages/member/MemberNotices";
import FamilyVehicles from "@/pages/member/FamilyVehicles";
import MemberProfile from "@/pages/member/Profile";
import MemberComplaints from "@/pages/member/Complaints";
import MemberServiceRequests from "@/pages/member/ServiceRequests";
import PublicLayout from "@/layouts/PublicLayout";
import PublicHome from "@/pages/public/Home";
import PublicAbout from "@/pages/public/About";
import PublicBodyMembers from "@/pages/public/BodyMembers";
import PublicGallery from "@/pages/public/Gallery";
import PublicContact from "@/pages/public/Contact";
import PublicNews from "@/pages/public/News";
import PublicEvents from "@/pages/public/Events";
import PublicMeetings from "@/pages/public/Meetings";
import PublicNotices from "@/pages/public/Notices";
import NotFound from "@/pages/NotFound";
import type { IconName } from "@/components/ui/icons";

const superAdminLinks = [
  { to: "/superadmin", label: "Dashboard", icon: "home" as IconName, end: true, section: "Overview" },
  { to: "/superadmin/societies", label: "Societies", icon: "building" as IconName, section: "Overview" },
];

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: "home" as IconName, end: true, section: "Overview" },
  { to: "/admin/houses", label: "Houses", icon: "home" as IconName, section: "Society" },
  { to: "/admin/houses/bulk", label: "Bulk Create Houses", icon: "plus" as IconName, section: "Society" },
  { to: "/admin/house-types", label: "House Types", icon: "grid" as IconName, section: "Society" },
  { to: "/admin/tenants", label: "Tenants", icon: "users" as IconName, section: "Society" },
  { to: "/admin/vehicles", label: "Vehicles", icon: "car" as IconName, section: "Society" },
  { to: "/admin/maintenance", label: "Maintenance", icon: "wallet" as IconName, section: "Finance" },
  { to: "/admin/maintenance/dues", label: "Dues", icon: "list" as IconName, section: "Finance" },
  { to: "/admin/payments", label: "Payments", icon: "creditCard" as IconName, section: "Finance" },
  { to: "/admin/shares", label: "Shares", icon: "database" as IconName, section: "Finance" },
  { to: "/admin/expenses", label: "Expenses", icon: "receipt" as IconName, section: "Finance" },
  { to: "/admin/expenses/categories", label: "Expense Categories", icon: "list" as IconName, section: "Finance" },
  { to: "/admin/income", label: "Other Income", icon: "wallet" as IconName, section: "Finance" },
  { to: "/admin/reports", label: "Reports", icon: "chart" as IconName, section: "Finance" },
  { to: "/admin/reports/income-expense", label: "Income & Expense", icon: "pieChart" as IconName, section: "Finance" },
  { to: "/admin/reports/top-payers", label: "Top Payers", icon: "trendingUp" as IconName, section: "Finance" },
  { to: "/admin/news", label: "News", icon: "megaphone" as IconName, section: "Communication" },
  { to: "/admin/events", label: "Events", icon: "calendar" as IconName, section: "Communication" },
  { to: "/admin/meetings", label: "Meetings", icon: "users" as IconName, section: "Communication" },
  { to: "/admin/notices", label: "Notices", icon: "bell" as IconName, section: "Communication" },
  { to: "/admin/complaints", label: "Complaints", icon: "alert" as IconName, section: "Communication" },
  { to: "/admin/service-requests", label: "Service Requests", icon: "key" as IconName, section: "Communication" },
  { to: "/admin/website/banners", label: "Banners", icon: "image" as IconName, section: "Website" },
  { to: "/admin/website/members", label: "Body Members", icon: "user" as IconName, section: "Website" },
  { to: "/admin/website/gallery", label: "Gallery", icon: "image" as IconName, section: "Website" },
  { to: "/admin/website/about", label: "About", icon: "info" as IconName, section: "Website" },
  { to: "/admin/website/contact", label: "Contact & Office Time", icon: "phone" as IconName, section: "Website" },
  { to: "/admin/member-logins", label: "Member Logins", icon: "key" as IconName, section: "Settings" },
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
        <Route path="/s/:slug/news" element={<PublicNews />} />
        <Route path="/s/:slug/events" element={<PublicEvents />} />
        <Route path="/s/:slug/meetings" element={<PublicMeetings />} />
        <Route path="/s/:slug/notices" element={<PublicNotices />} />
      </Route>

      <Route element={<ProtectedRoute allow={["superadmin"]} />}>
        <Route element={<SuperAdminPanel title="Super Admin" links={superAdminLinks} />}>
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/societies" element={<SocietyList />} />
          <Route path="/superadmin/societies/new" element={<SocietyForm />} />
          <Route path="/superadmin/societies/:id/edit" element={<SocietyForm />} />
          <Route path="*" element={<NotFound panel="superadmin" />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["admin"]} />}>
        <Route element={<AdminPanel title="Society Admin" links={adminLinks} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/houses" element={<HouseList />} />
          <Route path="/admin/houses/bulk" element={<HouseBulkCreate />} />
          <Route path="/admin/houses/:id" element={<HouseDetail />} />
          <Route path="/admin/maintenance" element={<MaintenanceSetup />} />
          <Route path="/admin/maintenance/dues" element={<DuesList />} />
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/payments/new" element={<RecordPayment />} />
          <Route path="/admin/shares" element={<ShareStatus />} />
          <Route path="/admin/expenses" element={<Expenses />} />
          <Route path="/admin/expenses/categories" element={<ExpenseCategories />} />
          <Route path="/admin/income" element={<Incomes />} />
          <Route path="/admin/reports" element={<ReportsIndex />} />
          <Route path="/admin/reports/pending" element={<PendingReport />} />
          <Route path="/admin/reports/defaulters" element={<Defaulters />} />
          <Route path="/admin/reports/collection" element={<CollectionReport />} />
          <Route path="/admin/reports/income-expense" element={<IncomeExpense />} />
          <Route path="/admin/reports/top-payers" element={<TopPayers />} />
          <Route path="/admin/house-types" element={<HouseTypes />} />
          <Route path="/admin/tenants" element={<TenantList />} />
          <Route path="/admin/tenants/:id" element={<TenantDetail />} />
          <Route path="/admin/vehicles" element={<VehicleList />} />
          <Route path="/admin/website/banners" element={<BannerManage />} />
          <Route path="/admin/website/members" element={<BodyMembersManage />} />
          <Route path="/admin/website/gallery" element={<GalleryManage />} />
          <Route path="/admin/website/gallery/:albumId" element={<AlbumDetail />} />
          <Route path="/admin/website/about" element={<AboutManage />} />
          <Route path="/admin/website/contact" element={<ContactOfficeManage />} />
          <Route path="/admin/news" element={<NewsManage />} />
          <Route path="/admin/events" element={<EventsManage />} />
          <Route path="/admin/meetings" element={<MeetingsManage />} />
          <Route path="/admin/notices" element={<NoticesManage />} />
          <Route path="/admin/complaints" element={<ComplaintList />} />
          <Route path="/admin/service-requests" element={<ServiceRequestList />} />
          <Route path="/admin/member-logins" element={<MemberLogins />} />
          <Route path="*" element={<NotFound panel="admin" />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["superadmin", "admin", "member", "tenant"]} />}>
        <Route path="/change-password" element={<ChangePassword />} />
      </Route>

      <Route element={<ProtectedRoute allow={["member", "tenant"]} />}>
        <Route element={<MemberLayout />}>
          <Route path="/member" element={<MyDashboard />} />
          <Route path="/member/dues" element={<MyDues />} />
          <Route path="/member/receipts" element={<MyReceipts />} />
          <Route path="/member/notices" element={<MemberNotices />} />
          <Route path="/member/family-vehicles" element={<FamilyVehicles />} />
          <Route path="/member/complaints" element={<MemberComplaints />} />
          <Route path="/member/service-requests" element={<MemberServiceRequests />} />
          <Route path="/member/profile" element={<MemberProfile />} />
          <Route path="*" element={<NotFound panel="member" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}