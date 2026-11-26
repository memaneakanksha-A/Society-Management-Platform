import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  section?: string;
}

export default function PanelLayout({ title, links }: { title: string; links: NavItem[] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  let lastSection: string | undefined;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-60 bg-slate-900 text-white flex flex-col">
        <div className="px-5 py-4 text-lg font-semibold border-b border-slate-700">{title}</div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((l) => {
            const showLabel = l.section && l.section !== lastSection;
            lastSection = l.section;
            return (
              <div key={l.to}>
                {showLabel && (
                  <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {l.section}
                  </p>
                )}
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm ${
                      isActive ? "bg-indigo-600" : "hover:bg-slate-800"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
          <span className="text-sm text-gray-600">
            {user?.name} <span className="text-gray-400">({user?.role})</span>
          </span>
          <button
            onClick={handleLogout}
            className="rounded bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}