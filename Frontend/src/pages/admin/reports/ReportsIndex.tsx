import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type IconName } from "@/components/ui/icons";

interface ReportLink {
  to: string;
  title: string;
  description: string;
  icon: IconName;
  color: string;
}

const reports: ReportLink[] = [
  {
    to: "/admin/reports/pending",
    title: "Pending Dues",
    description: "All outstanding maintenance dues for a financial year.",
    icon: "clock",
    color: "bg-amber-50 text-amber-600",
  },
  {
    to: "/admin/reports/defaulters",
    title: "Defaulters",
    description: "Houses with overdue dues, with WhatsApp reminders and Excel export.",
    icon: "alert",
    color: "bg-red-50 text-red-600",
  },
  {
    to: "/admin/reports/collection",
    title: "Collection Report",
    description: "Payments collected in a date range, grouped by mode, type and day.",
    icon: "wallet",
    color: "bg-green-50 text-green-600",
  },
  {
    to: "/admin/reports/top-payers",
    title: "Top Payers",
    description: "Residents ranked by payment discipline.",
    icon: "trendingUp",
    color: "bg-indigo-50 text-indigo-600",
  },
];

export default function ReportsIndex() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Reports" subtitle="Maintenance and collection reports" />
      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <button
            key={r.to}
            onClick={() => navigate(r.to)}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md hover:border-slate-300"
          >
            <div className={`rounded-xl p-3 ${r.color}`}>
              <Icon name={r.icon} size={22} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{r.title}</p>
              <p className="mt-1 text-sm text-slate-500">{r.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}