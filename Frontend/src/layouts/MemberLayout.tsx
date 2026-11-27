import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Icon, type IconName } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/common/Badge";

interface Tab {
  to: string;
  label: string;
  short: string;
  icon: IconName;
  end?: boolean;
}

const tabs: Tab[] = [
  { to: "/member", label: "Home", short: "Home", icon: "home", end: true },
  { to: "/member/dues", label: "Dues", short: "Dues", icon: "wallet" },
  { to: "/member/receipts", label: "Receipts", short: "Receipts", icon: "receipt" },
  { to: "/member/notices", label: "Notices", short: "Notices", icon: "bell" },
  { to: "/member/family-vehicles", label: "My Family & Vehicles", short: "Family", icon: "users" },
  { to: "/member/complaints", label: "Complaints", short: "Complaints", icon: "alert" },
  { to: "/member/service-requests", label: "Service Requests", short: "Requests", icon: "key" },
  { to: "/member/profile", label: "Profile", short: "Profile", icon: "user" },
];

export default function MemberLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <Icon name="building" size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Member Portal</p>
              <p className="text-xs text-slate-500">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={user?.role === "tenant" ? "blue" : "indigo"}>{user?.role}</Badge>
            <Button variant="ghost" size="sm" leftIcon="logout" onClick={handleLogout}>
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1" aria-label="Member navigation">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon name={t.icon} size={18} />
                <span className="truncate">{t.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden"
        aria-label="Member bottom navigation"
      >
        <div className="grid grid-cols-8">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium ${
                  isActive ? "text-indigo-600" : "text-slate-500"
                }`
              }
            >
              <Icon name={t.icon} size={20} />
              <span className="truncate">{t.short}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}