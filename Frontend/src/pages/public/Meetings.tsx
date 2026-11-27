import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSociety } from "@/context/SocietyContext";
import { getPublicMeetings } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import { fileUrl } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";
import Loader from "@/components/common/Loader";
import Badge from "@/components/common/Badge";
import type { PublicMeeting, PublicMeetingType } from "@/types/public.types";

const TYPE_LABELS: Record<PublicMeetingType, string> = {
  general_body: "General Body",
  committee: "Committee",
  agm: "AGM",
  special: "Special",
};

const statusVariant = (status: PublicMeeting["status"]): "blue" | "green" | "red" =>
  status === "upcoming" ? "blue" : status === "completed" ? "green" : "red";

export default function PublicMeetings() {
  const { society } = useSociety();
  const slug = society?.slug ?? "";
  const [items, setItems] = useState<PublicMeeting[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    getPublicMeetings(slug, page)
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setPages(res.pages);
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
  }, [slug, page]);

  if (!society) return <Loader />;
  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">No meetings yet.</p>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((m) => (
              <div key={m._id} className="rounded-lg bg-white p-4 shadow">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-medium text-gray-900">{m.title}</h2>
                  <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {TYPE_LABELS[m.type]} · {formatDate(m.date)}
                  {m.time ? ` · ${m.time}` : ""}
                </p>
                {m.venue && <p className="text-sm text-gray-600">Venue: {m.venue}</p>}
                {m.agenda && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{m.agenda}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-gray-500">Attendees: {m.attendeesCount}</span>
                  {fileUrl(m.minutesFile) && (
                    <a href={fileUrl(m.minutesFile)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      Download minutes (PDF)
                    </a>
                  )}
                  {m.minutes && <span className="text-gray-500">Minutes available below</span>}
                </div>
                {m.minutes && <p className="mt-2 whitespace-pre-wrap border-t pt-2 text-sm text-gray-700">{m.minutes}</p>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 disabled:opacity-40">
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {pages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 disabled:opacity-40">
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}