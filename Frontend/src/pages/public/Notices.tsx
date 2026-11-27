import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSociety } from "@/context/SocietyContext";
import { getPublicNotices } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import { fileUrl } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";
import Loader from "@/components/common/Loader";
import type { PublicNotice, PublicNoticeCategory } from "@/types/public.types";

const CATEGORY_LABELS: Record<PublicNoticeCategory, string> = {
  general: "General",
  maintenance: "Maintenance",
  water: "Water",
  security: "Security",
  legal: "Legal",
  event: "Event",
  other: "Other",
};

export default function PublicNotices() {
  const { society } = useSociety();
  const slug = society?.slug ?? "";
  const [items, setItems] = useState<PublicNotice[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    getPublicNotices(slug, page)
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
      <h1 className="text-2xl font-semibold text-gray-900">Notices</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">No notices yet.</p>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((n) => (
              <div
                key={n._id}
                className={`rounded-lg bg-white p-4 shadow ${n.isImportant ? "border-l-4 border-amber-400" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {n.isImportant && <span className="text-xs font-semibold uppercase text-amber-600">Important</span>}
                  <h2 className="font-medium text-gray-900">{n.title}</h2>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {CATEGORY_LABELS[n.category]}
                  {n.publishOn ? ` · ${formatDate(n.publishOn)}` : ""}
                  {n.expiresOn ? ` · Valid till ${formatDate(n.expiresOn)}` : ""}
                </p>
                {n.body && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{n.body}</p>}
                {fileUrl(n.attachment) && (
                  <a href={fileUrl(n.attachment)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
                    Download attachment (PDF)
                  </a>
                )}
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