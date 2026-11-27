import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSociety } from "@/context/SocietyContext";
import { getPublicEvents } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import { fileUrl } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";
import Loader from "@/components/common/Loader";
import type { PublicEvent } from "@/types/public.types";

function EventCard({ item }: { item: PublicEvent }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      {fileUrl(item.image) && (
        <div className="h-40 w-full bg-gray-100">
          <img src={fileUrl(item.image)} alt={item.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="space-y-1 p-4">
        <p className="text-xs font-medium text-indigo-600">{formatDate(item.date)}</p>
        <p className="font-medium text-gray-900">{item.title}</p>
        <p className="text-sm text-gray-500">
          {[item.time, item.venue].filter(Boolean).join(" · ") || "Details coming soon"}
        </p>
        {item.description && <p className="line-clamp-3 text-sm text-gray-600">{item.description}</p>}
      </div>
    </div>
  );
}

export default function PublicEvents() {
  const { society } = useSociety();
  const slug = society?.slug ?? "";
  const [items, setItems] = useState<PublicEvent[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    getPublicEvents(slug, page)
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
      <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">No events yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <EventCard key={item._id} item={item} />
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