import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getMe,
  getDashboard,
  getNotices,
  getMeetings,
  getEvents,
  getErrorMessage,
} from "@/api/member.api";
import type {
  MemberMeResponse,
  MemberDashboard,
  MemberNotice,
  MemberMeeting,
  MemberEvent,
} from "@/types/member.types";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardTitle } from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";

export default function MyDashboard() {
  const [me, setMe] = useState<MemberMeResponse | null>(null);
  const [data, setData] = useState<MemberDashboard | null>(null);
  const [notices, setNotices] = useState<MemberNotice[]>([]);
  const [meetings, setMeetings] = useState<MemberMeeting[]>([]);
  const [events, setEvents] = useState<MemberEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getMe(), getDashboard(), getNotices(), getMeetings(), getEvents()])
      .then(([meRes, dash, n, m, e]) => {
        if (!active) return;
        setMe(meRes);
        setData(dash);
        setNotices(n.slice(0, 3));
        setMeetings(m.slice(0, 3));
        setEvents(e.slice(0, 3));
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
  if (!data || !me) return <p className="text-slate-500">No data available.</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {me.profile.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          House {me.house.houseNo}
          {me.house.houseType ? ` · ${me.house.houseType}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outstanding" value={formatCurrency(data.outstanding)} icon="wallet" color={data.outstanding > 0 ? "red" : "green"} />
        <StatCard label="Advance Credit" value={formatCurrency(data.advanceCredit)} icon="database" color="blue" />
        <StatCard
          label="Next Due"
          value={data.nextDue ? formatCurrency(data.nextDue.amount) : "—"}
          icon="calendar"
          color="amber"
          subtext={data.nextDue ? formatDate(data.nextDue.dueDate) : "No pending dues"}
        />
        <StatCard
          label="Last Payment"
          value={data.lastPayment ? formatCurrency(data.lastPayment.amount) : "—"}
          icon="creditCard"
          color="green"
          subtext={data.lastPayment ? formatDate(data.lastPayment.paidOn) : "No payments yet"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Latest Notices</CardTitle>
            <Link to="/member/notices" className="text-sm text-indigo-600 hover:underline">View all</Link>
          </div>
          {notices.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No notices.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {notices.map((n) => (
                <li key={n._id} className="flex items-start gap-2 text-sm">
                  <span className={n.isImportant ? "text-amber-500" : "text-slate-300"}>•</span>
                  <div>
                    <p className="font-medium text-slate-900">{n.title}</p>
                    {n.publishOn && <p className="text-xs text-slate-400">{formatDate(n.publishOn)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Upcoming Meetings & Events</CardTitle>
          {meetings.length === 0 && events.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing scheduled.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {meetings.map((m) => (
                <li key={`m-${m._id}`} className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{m.title}</span>
                  <span className="text-xs text-slate-500">{formatDate(m.date)}</span>
                </li>
              ))}
              {events.map((e) => (
                <li key={`e-${e._id}`} className="flex items-center justify-between gap-2">
                  <span className="text-slate-700">{e.title}</span>
                  <span className="text-xs text-slate-500">{formatDate(e.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}