import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { getHouseStats } from "@/api/house.api";
import { useSocietySlug } from "@/hooks/useSocietySlug";
import { Card, PageHeader, StatCard, Button, EmptyState, SkeletonCard } from "@/components/ui";
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
  const { slug, loading: slugLoading, retry: retrySlug } = useSocietySlug();

  useEffect(() => {
    getHouseStats()
      .then(setStats)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const websiteUrl = slug ? `${window.location.origin}/s/${slug}` : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your society"
        actions={
          <Button
            variant="secondary"
            leftIcon="externalLink"
            disabled={slugLoading && !websiteUrl}
            onClick={() => (websiteUrl ? window.open(websiteUrl, "_blank", "noopener,noreferrer") : retrySlug())}
          >
            View Website
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              label="Total Houses"
              value={stats.total}
              icon="home"
              color="indigo"
              subtext={`${stats.withoutOwner} without owner`}
            />
            <StatCard
              label="Owner Living"
              value={stats.ownerLiving}
              icon="user"
              color="green"
            />
            <StatCard
              label="Rented"
              value={stats.rented}
              icon="key"
              color="blue"
            />
            <StatCard
              label="Vacant"
              value={stats.vacant}
              icon="home"
              color="amber"
            />
          </div>

          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">Your Public Website</p>
                {slugLoading && !websiteUrl ? (
                  <p className="mt-1 text-sm text-slate-500">Loading website link…</p>
                ) : websiteUrl ? (
                  <p className="mt-1 text-sm text-slate-500 font-mono break-all">{websiteUrl}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    Website link unavailable.{" "}
                    <button onClick={retrySlug} className="text-indigo-600 hover:underline">
                      Retry
                    </button>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  leftIcon="externalLink"
                  disabled={!websiteUrl}
                  onClick={() => websiteUrl && window.open(websiteUrl, "_blank", "noopener,noreferrer")}
                >
                  Open
                </Button>
                <Button
                  variant="secondary"
                  leftIcon="copy"
                  disabled={!websiteUrl}
                  onClick={() => websiteUrl && navigator.clipboard.writeText(websiteUrl).then(() => toast.success("Link copied"))}
                >
                  Copy Link
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Houses by Type</h3>
            </div>
            {stats.byType.length === 0 ? (
              <EmptyState icon="chart" title="No house types yet" description="Create house types to see distribution here." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
                {stats.byType.map((t) => (
                  <div key={t.code} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{t.code}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{t.count}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}