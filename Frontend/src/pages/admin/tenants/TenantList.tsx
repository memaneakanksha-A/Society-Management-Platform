import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/api/axios";
import {
  getTenants,
  getTenantStats,
} from "@/api/tenant.api";
import type {
  Tenant,
  TenantStats,
  TenantQuery,
  AgreementState,
  PoliceVerificationStatus,
} from "@/types/tenant.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import Loader from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

const agreementStateColors: Record<AgreementState, string> = {
  valid: "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};

const policeStatusLabels: Record<PoliceVerificationStatus, string> = {
  pending: "Pending",
  done: "Done",
  not_required: "Not Required",
};

const policeStatusColors: Record<PoliceVerificationStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  not_required: "bg-gray-100 text-gray-700",
};

const statusColors: Record<Tenant["status"], string> = {
  active: "bg-green-100 text-green-700",
  vacated: "bg-gray-100 text-gray-700",
};

export default function TenantList() {
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<TenantStats>({
    active: 0,
    expiringSoon: 0,
    expired: 0,
    vacated: 0,
    policeVerificationPending: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState<TenantQuery["status"] | "">("");

  useEffect(() => {
    getTenantStats()
      .then(setStats)
      .catch(() => setStats({ active: 0, expiringSoon: 0, expired: 0, vacated: 0, policeVerificationPending: 0 }))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const query: TenantQuery = {
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      page,
      limit: 20,
    };
    getTenants(query)
      .then((res) => {
        setTenants(res.tenants);
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter, page]);

  const columns = useMemo(
    () => [
      {
        key: "house",
        header: "House No",
        render: (row: Tenant) => (
          <span className="font-medium text-slate-900">{row.house?.houseNo || "-"}</span>
        ),
      },
      {
        key: "tenant",
        header: "Tenant",
        render: (row: Tenant) => (
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            {row.phone && <p className="text-xs text-slate-500">{row.phone}</p>}
          </div>
        ),
      },
      {
        key: "rent",
        header: "Rent",
        render: (row: Tenant) => (
          <span className="text-slate-700">{formatCurrency(row.rentAmount)}</span>
        ),
      },
      {
        key: "agreementEndDate",
        header: "Agreement End",
        render: (row: Tenant) => (
          <span className="text-slate-700">{formatDate(row.agreementEndDate)}</span>
        ),
      },
      {
        key: "daysLeft",
        header: "Days Left",
        render: (row: Tenant) => {
          if (row.status === "vacated") return <span className="text-slate-400">-</span>;
          const days = row.daysLeft ?? 0;
          const color = days < 0 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-green-600";
          return <span className={`font-medium ${color}`}>{days}</span>;
        },
      },
      {
        key: "agreementState",
        header: "Agreement",
        render: (row: Tenant) => {
          if (row.status === "vacated") {
            return (
              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Vacated
              </span>
            );
          }
          const state = row.agreementState || "valid";
          const label = state === "valid" ? "Valid" : state === "expiring_soon" ? "Expiring Soon" : "Expired";
          return (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${agreementStateColors[state]}`}>
              {label}
            </span>
          );
        },
      },
      {
        key: "policeVerification",
        header: "Police Verification",
        render: (row: Tenant) => {
          const status = row.policeVerification?.status || "pending";
          return (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${policeStatusColors[status]}`}>
              {policeStatusLabels[status]}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Tenant Status",
        render: (row: Tenant) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status]}`}>
            {row.status === "active" ? "Active" : "Vacated"}
          </span>
        ),
      },
    ],
    []
  );

  if (loading && tenants.length === 0) {
    return <Loader />;
  }

  const filterTabs = [
    { id: "", label: "All" },
    { id: "active", label: "Active" },
    { id: "expiring", label: "Expiring Soon" },
    { id: "expired", label: "Expired" },
    { id: "vacated", label: "Vacated" },
  ];

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle={statsLoading ? "Loading stats..." : `Showing ${tenants.length} of ${total} tenants`}
      />

      {!statsLoading && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Active"
            value={stats.active}
            icon="user"
            color="green"
          />
          <StatCard
            label="Expiring Soon"
            value={stats.expiringSoon}
            icon="alert"
            color="amber"
          />
          <StatCard
            label="Expired"
            value={stats.expired}
            icon="alert"
            color="red"
          />
          <StatCard
            label="Vacated"
            value={stats.vacated}
            icon="user"
            color="gray"
          />
          <StatCard
            label="Police Verification Pending"
            value={stats.policeVerificationPending}
            icon="shield"
            color="blue"
          />
        </div>
      )}

      <Card className="mb-4">
        <Input
          label="Search"
          placeholder="Search tenant name, phone, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon="search"
          className="max-w-xs"
        />
      </Card>

      <Tabs
        tabs={filterTabs}
        activeTab={statusFilter || ""}
        onChange={(id) => setStatusFilter((id || "") as TenantQuery["status"])}
        variant="soft"
        className="mb-4"
      />

      <DataTable
        columns={columns}
        data={tenants}
        keyExtractor={(row) => row._id}
        loading={loading}
        emptyMessage="No tenants found."
        emptyIcon="users"
        onRowClick={(row) => navigate(`/admin/tenants/${row._id}`)}
        striped
        hoverable
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} tenants</p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-slate-600">
            Page {page} of {pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}