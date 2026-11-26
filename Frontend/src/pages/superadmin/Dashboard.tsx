import { useEffect, useState } from "react";
import { getSocieties } from "@/api/superadmin.api";
import type { Society } from "@/types/society.types";
import Loader from "@/components/common/Loader";

export default function SuperAdminDashboard() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSocieties()
      .then(setSocieties)
      .catch(() => setSocieties([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const active = societies.filter((s) => s.status === "active").length;
  const houses = societies.reduce((sum, s) => sum + (s.totalHouses || 0), 0);

  const cards = [
    { label: "Total Societies", value: societies.length },
    { label: "Active Societies", value: active },
    { label: "Total Houses", value: houses },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}