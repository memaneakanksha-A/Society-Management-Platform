import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSocietySlug } from "@/hooks/useSocietySlug";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/icons";
import Badge from "@/components/common/Badge";

interface NavItem {
  to: string;
  label: string;
  icon?: IconName;
  end?: boolean;
  section?: string;
  disabled?: boolean;
  soon?: boolean;
}

interface PanelLayoutProps {
  title: string;
  links: NavItem[];
  siteSlug?: string | null;
  siteName?: string | null;
  siteLogo?: string | null;
  subtitle?: string;
}

const sidebarGroups: Record<string, { label: string; icon: IconName }> = {
  Overview: { label: "Overview", icon: "home" },
  Society: { label: "Society", icon: "building" },
  Finance: { label: "Finance", icon: "wallet" },
  Communication: { label: "Communication", icon: "megaphone" },
  Website: { label: "Website", icon: "globe" },
  Settings: { label: "Settings", icon: "settings" },
  SuperAdmin: { label: "Super Admin", icon: "shield" },
};

export default function PanelLayout({
  title,
  links,
  siteSlug,
  siteName,
  siteLogo,
  subtitle = "Society Admin",
}: PanelLayoutProps) {
  const { user, logout } = useAuth();
  const { loading: slugLoading, error: slugError, retry: retrySlug } = useSocietySlug();
  const navigate = useNavigate();
  const location = useLocation();
  const bestMatch = links
    .filter((l) => !l.disabled)
    .map((l) => l.to)
    .filter((to) => location.pathname === to || location.pathname.startsWith(to + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleViewWebsite = () => {
    if (siteSlug) {
      window.open(`/s/${siteSlug}`, "_blank", "noopener,noreferrer");
    }
  };

  const handleSidebarToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Group links by section
  const groupedLinks: Record<string, NavItem[]> = {};
  links.forEach((link) => {
    const section = link.section || "Overview";
    if (!groupedLinks[section]) groupedLinks[section] = [];
    groupedLinks[section].push(link);
  });

  const sectionOrder = ["Overview", "Society", "Finance", "Communication", "Website", "Settings", "SuperAdmin"];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static z-50 flex flex-col h-screen lg:h-auto
          bg-white border-r border-slate-200 transition-all duration-200
          ${sidebarCollapsed ? "w-16" : "w-64"} ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 lg:px-5">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              {siteLogo ? (
                <img src={siteLogo} alt="" className="h-8 w-auto rounded-lg" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Icon name="building" size={20} className="text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 text-sm">{siteName || title}</p>
                <p className="truncate text-xs text-slate-500">{subtitle}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSidebarToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            <Icon name={sidebarCollapsed ? "chevronRight" : "chevronLeft"} size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main navigation">
          {sectionOrder
            .filter((section) => groupedLinks[section]?.length)
            .map((section) => {
              const group = sidebarGroups[section];
              const items = groupedLinks[section];
              return (
                <div key={section} className={sidebarCollapsed ? "hidden" : "block"}>
                  <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {group?.label || section}
                  </p>
                  {items.map((item) => {
                    const isExactActive = location.pathname === item.to;
                    const active = item.to === bestMatch;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                            ${active
                              ? "bg-indigo-50 text-indigo-600"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
                            ${item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
                          `}
                        aria-current={isExactActive ? "page" : undefined}
                        aria-disabled={item.disabled}
                      >
                        <Icon name={(item.icon || "file") as IconName} size={18} className="flex-shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {item.soon && <Badge variant="amber">Soon</Badge>}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
        </nav>

        {/* Sidebar footer - View Website */}
        <div className="border-t border-slate-200 p-3">
          {user?.role === "admin" && (
            <button
              onClick={siteSlug ? handleViewWebsite : retrySlug}
              disabled={slugLoading && !siteSlug}
              className={`
                flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors
                disabled:opacity-60
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
              title={sidebarCollapsed ? "View Website" : ""}
            >
              {slugLoading && !siteSlug ? (
                <Icon name="refresh" size={18} className="animate-spin" />
              ) : (
                <Icon name="externalLink" size={18} />
              )}
              {!sidebarCollapsed && <span className="truncate">View Website</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSidebarToggle}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Open menu"
            >
              <Icon name="menu" size={22} />
            </button>
            <h1 className="text-lg font-semibold text-slate-900 hidden sm:block">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {user?.role === "admin" && (
              <button
                onClick={siteSlug ? handleViewWebsite : retrySlug}
                disabled={slugLoading && !siteSlug}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-60"
                title={slugError && !siteSlug ? "Retry loading website link" : "View Website"}
              >
                {slugLoading && !siteSlug ? (
                  <Icon name="refresh" size={16} className="animate-spin" />
                ) : (
                  <Icon name="externalLink" size={16} />
                )}
                View Website
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100">
              <span className="text-sm text-slate-700">{user?.name}</span>
              <Badge variant={user?.role === "superadmin" ? "indigo" : "blue"}>{user?.role}</Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              leftIcon="logout"
              onClick={handleLogout}
              className="hidden sm:flex"
            >
              Logout
            </Button>

            <Button
              variant="ghost"
              size="sm"
              leftIcon="logout"
              onClick={handleLogout}
              className="sm:hidden"
              aria-label="Logout"
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Export the Icons type for use in other files
export type { NavItem };