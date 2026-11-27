import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMe, getErrorMessage } from "@/api/member.api";
import type { MemberMeResponse } from "@/types/member.types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import ChangePasswordForm from "@/components/member/ChangePasswordForm";
import { formatDate } from "@/utils/formatDate";

export default function Profile() {
  const [me, setMe] = useState<MemberMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMe()
      .then((res) => {
        if (active) setMe(res);
      })
      .catch((err) => {
        if (active) toast.error(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loader />;
  if (!me) return <p className="text-slate-500">Profile not available.</p>;

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your account and house details" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Account</CardTitle>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{me.profile.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{me.profile.email || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">{me.profile.phone || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium capitalize text-slate-900">{me.profile.role}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle>House</CardTitle>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">House No</dt>
              <dd className="font-medium text-slate-900">{me.house.houseNo}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Type</dt>
              <dd className="font-medium text-slate-900">{me.house.houseType || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Area</dt>
              <dd className="font-medium text-slate-900">{me.house.area ? `${me.house.area} sq.ft` : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Maintenance By</dt>
              <dd className="font-medium capitalize text-slate-900">{me.house.maintenancePayableBy}</dd>
            </div>
            {me.tenant && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Agreement Ends</dt>
                <dd className="font-medium text-slate-900">{formatDate(me.tenant.agreementEndDate)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Owner &amp; Tenant</CardTitle>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Owner</p>
              {me.owner ? (
                <div className="mt-1 space-y-0.5 text-sm">
                  <p className="font-medium text-slate-900">{me.owner.name}</p>
                  {me.owner.phone && <p className="text-slate-600">{me.owner.phone}</p>}
                  {me.owner.email && <p className="text-slate-600">{me.owner.email}</p>}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No owner on record.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Tenant</p>
              {me.tenant ? (
                <div className="mt-1 space-y-0.5 text-sm">
                  <p className="font-medium text-slate-900">{me.tenant.name}</p>
                  {me.tenant.phone && <p className="text-slate-600">{me.tenant.phone}</p>}
                  <p className="text-slate-600">Agreement ends {formatDate(me.tenant.agreementEndDate)}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No active tenant.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Change Password</CardTitle>
          <div className="mt-3 max-w-md">
            <ChangePasswordForm onSuccess={() => undefined} />
          </div>
        </Card>
      </div>
    </div>
  );
}