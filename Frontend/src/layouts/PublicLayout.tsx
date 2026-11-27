import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { SocietyProvider, useSociety } from "@/context/SocietyContext";
import { fileUrl } from "@/utils/constants";
import Loader from "@/components/common/Loader";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-50 text-indigo-700"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

function Shell() {
  const { society, loading, notFound } = useSociety();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  if (notFound || !society) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Society not found</h1>
        <p className="text-gray-500">
          The society you are looking for does not exist or is not active.
        </p>
        <Link
          to="/"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to home
        </Link>
      </div>
    );
  }

  const base = `/s/${society.slug}`;
  const links = [
    { to: base, label: "Home", end: true },
    { to: `${base}/about`, label: "About", end: false },
    { to: `${base}/members`, label: "Body Members", end: false },
    { to: `${base}/gallery`, label: "Gallery", end: false },
    { to: `${base}/news`, label: "News", end: false },
    { to: `${base}/events`, label: "Events", end: false },
    { to: `${base}/meetings`, label: "Meetings", end: false },
    { to: `${base}/notices`, label: "Notices", end: false },
    { to: `${base}/contact`, label: "Contact", end: false },
  ];

  const logo = fileUrl(society.logo);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to={base} className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={society.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
                {society.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-lg font-semibold text-gray-900">{society.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/login"
              className="ml-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Admin Login
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-gray-200 px-4 py-2 md:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/login"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              onClick={() => setMenuOpen(false)}
            >
              Admin Login
            </Link>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900">{society.name}</p>
          {society.address && <p>{society.address}</p>}
          {society.contact?.phone && (
            <p>
              Phone:{" "}
              <a className="text-indigo-600 hover:underline" href={`tel:${society.contact.phone}`}>
                {society.contact.phone}
              </a>
            </p>
          )}
          {society.contact?.email && (
            <p>
              Email:{" "}
              <a
                className="text-indigo-600 hover:underline"
                href={`mailto:${society.contact.email}`}
              >
                {society.contact.email}
              </a>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function PublicLayout() {
  return (
    <SocietyProvider>
      <Shell />
    </SocietyProvider>
  );
}