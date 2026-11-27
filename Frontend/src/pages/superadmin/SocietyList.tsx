import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getSocieties, toggleSocietyStatus } from "@/api/superadmin.api";
import { getErrorMessage } from "@/api/axios";
import type { Society } from "@/types/society.types";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/icons";
import Badge from "@/components/common/Badge";
export default function SocietyList() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setSocieties(await getSocieties());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await toggleSocietyStatus(id);
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleViewSite = (slug: string, status: string) => {
    if (status !== "active") return;
    window.open(`/s/${slug}`, "_blank", "noopener,noreferrer");
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: Society) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      render: (row: Society) => (
        <span className="text-slate-500 font-mono">{row.slug}</span>
      ),
    },
    {
      key: "totalHouses",
      header: "Houses",
      render: (row: Society) => (
        <span className="text-slate-700">{row.totalHouses}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Society) => (
        <Badge variant={row.status === "active" ? "green" : "red"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "180px",
      render: (row: Society) => (
        <div className="flex items-center gap-2 justify-end">
          <Link
            to={`/superadmin/societies/${row._id}/edit`}
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
            aria-label={`Edit ${row.name}`}
          >
            <Icon name="edit" size={16} />
          </Link>
          {row.status === "active" && (
            <button
              onClick={() => handleViewSite(row.slug, row.status)}
              className="text-slate-400 hover:text-green-600 transition-colors p-1"
              aria-label={`View website for ${row.name}`}
              title="View Website"
            >
              <Icon name="externalLink" size={16} />
            </button>
          )}
          <button
            onClick={() => handleToggle(row._id)}
            className={`text-slate-400 hover:underline transition-colors p-1 ${
              row.status === "active" ? "hover:text-red-600" : "hover:text-green-600"
            }`}
            aria-label={`${row.status === "active" ? "Deactivate" : "Activate"} ${row.name}`}
          >
            <Icon name={row.status === "active" ? "lock" : "unlock"} size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Societies"
        subtitle={`Managing ${societies.length} societies`}
        actions={
          <Link to="/superadmin/societies/new">
            <Button variant="primary" leftIcon="plus">Add Society</Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={societies}
        keyExtractor={(row) => row._id}
        loading={loading}
        emptyMessage="No societies yet."
        emptyIcon="building"
        emptyAction={
          <Link to="/superadmin/societies/new">
            <Button variant="primary" leftIcon="plus">Add Society</Button>
          </Link>
        }
        striped
        hoverable
      />
    </div>
  );
}