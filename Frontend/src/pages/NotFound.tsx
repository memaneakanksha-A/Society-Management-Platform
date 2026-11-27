import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icons";

export default function NotFound({ panel = "admin" }: { panel?: "admin" | "superadmin" | "member" }) {
  const homePath = panel === "superadmin" ? "/superadmin" : panel === "member" ? "/member" : "/admin";

  const linkStyles = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
        <div className="mx-auto mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
          <Icon name="alert" size={32} />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            to={homePath}
            className={`${linkStyles} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500`}
          >
            <Icon name="home" size={16} />
            Go to Dashboard
          </Link>
          <Link
            to={homePath}
            className={`${linkStyles} bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500`}
          >
            <Icon name="chevronLeft" size={16} />
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}