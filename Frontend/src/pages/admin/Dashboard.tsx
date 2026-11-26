import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getHouseStats } from "@/api/house.api";
import type { HouseStats } from "@/types/house.types";

const empty: HouseStats = {
  total: 0,
  ownerLiving: 0,
  rented: 0,
  vacant: 0,
  withoutOwner: 0,
  byType: [],
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<HouseStats>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHouseStats()
      .then(setStats)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Houses", value: stats.total },
    { label: "Owner Living", value: stats.ownerLiving },
    { label: "Rented", value: stats.rented },
    { label: "Vacant", value: stats.vacant },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      {loading ? (
        <p className="text-gray-500">Loading stats...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="mt-1 text-3xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}