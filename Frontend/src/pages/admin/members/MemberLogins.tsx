import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getMemberLogins,
  createMemberLogin,
  bulkCreateMemberLogins,
  resetMemberPassword,
  setMemberLoginStatus,
  getErrorMessage,
} from "@/api/member.api";
import type { MemberLoginEntry, BulkCreateLoginResult } from "@/types/member.types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import Badge from "@/components/common/Badge";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import { useDebounce } from "@/hooks/useDebounce";

const downloadCsv = (rows: BulkCreateLoginResult[]) => {
  const header = ["House No", "Name", "Identifier", "Temporary Password"];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(",")];
  rows.forEach((r) => {
    lines.push([r.houseNo, r.name, r.identifier, r.tempPassword].map(escape).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "member-logins.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy. Please copy manually.");
  }
};

export default function MemberLogins() {
  const [items, setItems] = useState<MemberLoginEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [role, setRole] = useState("");

  const [busy, setBusy] = useState(false);
  const [tempInfo, setTempInfo] = useState<{ title: string; password: string } | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkCreateLoginResult[] | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMemberLogins({
        search: debouncedSearch || undefined,
        role: role || undefined,
        page,
        limit: 20,
      });
      setItems(res.logins);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch, role, page]);

  const handleCreate = async (entry: MemberLoginEntry) => {
    setBusy(true);
    try {
      const res = await createMemberLogin(entry.houseId, entry.role);
      setTempInfo({ title: `Login created for ${entry.name}`, password: res.tempPassword });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (entry: MemberLoginEntry) => {
    if (!entry.userId) return;
    setBusy(true);
    try {
      const tempPassword = await resetMemberPassword(entry.userId);
      setTempInfo({ title: `Password reset for ${entry.name}`, password: tempPassword });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (entry: MemberLoginEntry) => {
    if (!entry.userId || entry.isActive === null) return;
    setBusy(true);
    try {
      await setMemberLoginStatus(entry.userId, !entry.isActive);
      toast.success(entry.isActive ? "Login deactivated" : "Login activated");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleBulk = async () => {
    setBusy(true);
    try {
      const res = await bulkCreateMemberLogins("owner");
      setBulkRows(res.created);
      if (res.created.length === 0) {
        toast("No new owner logins were created");
      } else {
        toast.success(`${res.created.length} logins created`);
      }
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "houseNo",
        header: "House",
        width: "110px",
        render: (r: MemberLoginEntry) => <span className="font-medium text-slate-900">{r.houseNo}</span>,
      },
      {
        key: "role",
        header: "Role",
        width: "100px",
        render: (r: MemberLoginEntry) => <Badge variant={r.role === "owner" ? "indigo" : "blue"}>{r.role}</Badge>,
      },
      { key: "name", header: "Name", render: (r: MemberLoginEntry) => <span className="text-slate-700">{r.name}</span> },
      {
        key: "identifier",
        header: "Identifier",
        render: (r: MemberLoginEntry) => (
          <span className="text-slate-600">{r.email || r.phone || <span className="text-red-500">Missing email/phone</span>}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "130px",
        render: (r: MemberLoginEntry) =>
          r.userId ? (
            <Badge variant={r.isActive ? "green" : "gray"}>{r.isActive ? "Active" : "Inactive"}</Badge>
          ) : (
            <Badge variant="amber">No login</Badge>
          ),
      },
      {
        key: "actions",
        header: "",
        width: "300px",
        render: (r: MemberLoginEntry) => (
          <div className="flex items-center justify-end gap-1.5">
            {r.userId ? (
              <>
                <Button size="sm" variant="secondary" loading={busy} disabled={busy} onClick={() => handleReset(r)} leftIcon="key">
                  Reset
                </Button>
                <Button size="sm" variant="ghost" loading={busy} disabled={busy} onClick={() => handleToggle(r)}>
                  {r.isActive ? "Deactivate" : "Activate"}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                loading={busy}
                disabled={busy || (!r.email && !r.phone)}
                onClick={() => handleCreate(r)}
                leftIcon="plus"
              >
                Create login
              </Button>
            )}
          </div>
        ),
      },
    ],
    [busy]
  );

  return (
    <div>
      <PageHeader
        title="Member Logins"
        subtitle={`Showing ${items.length} of ${total} entries`}
        actions={
          <Button leftIcon="key" loading={busy} disabled={busy} onClick={handleBulk}>
            Create logins for all owners
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Search" placeholder="House, name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon="search" />
        <Select
          label="Role"
          placeholder="All"
          options={[
            { value: "", label: "All" },
            { value: "owner", label: "Owner" },
            { value: "tenant", label: "Tenant" },
          ]}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>

      {loading && items.length === 0 ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            keyExtractor={(r) => `${r.houseId}:${r.role}`}
            loading={loading}
            emptyMessage="No houses with owners or tenants found."
            emptyIcon="key"
            striped
            hoverable
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} entries</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="flex items-center px-3 text-sm text-slate-600">Page {page} of {pages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!tempInfo}
        title={tempInfo?.title || "Temporary Password"}
        onClose={() => setTempInfo(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTempInfo(null)}>Done</Button>
            <Button leftIcon="copy" onClick={() => tempInfo && copyText(tempInfo.password)}>Copy</Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            This temporary password is shown only once. Copy it now and share it securely.
          </p>
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-center font-mono text-xl font-semibold tracking-wider text-slate-900">
            {tempInfo?.password}
          </p>
        </div>
      </Modal>

      <Modal
        open={!!bulkRows}
        title="Bulk Create Result"
        onClose={() => setBulkRows(null)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkRows(null)}>Close</Button>
            <Button leftIcon="download" onClick={() => bulkRows && downloadCsv(bulkRows)} disabled={!bulkRows?.length}>
              Download CSV
            </Button>
          </>
        }
      >
        {bulkRows && bulkRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">House</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Identifier</th>
                  <th className="px-3 py-2">Temp Password</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{r.houseNo}</td>
                    <td className="px-3 py-2 text-slate-700">{r.name}</td>
                    <td className="px-3 py-2 text-slate-600">{r.identifier}</td>
                    <td className="px-3 py-2 font-mono text-slate-900">{r.tempPassword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No new logins were created (all owners already have logins or lack email/phone).</p>
        )}
      </Modal>
    </div>
  );
}