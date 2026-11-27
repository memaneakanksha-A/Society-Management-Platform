import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getNotices, getErrorMessage } from "@/api/member.api";
import type { MemberNotice } from "@/types/member.types";
import Loader from "@/components/common/Loader";
import { fileUrl } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";

export default function MemberNotices() {
  const [items, setItems] = useState<MemberNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getNotices()
      .then((res) => {
        if (active) setItems(res);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Notices</h1>
        <p className="mt-1 text-sm text-slate-500">{items.length} notices</p>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-500">No notices at the moment.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n._id}
              className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                n.isImportant ? "border-l-4 border-l-amber-400" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {n.isImportant && <span className="text-xs font-semibold uppercase text-amber-600">Important</span>}
                <h3 className="font-medium text-slate-900">{n.title}</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                <span className="capitalize">{n.category}</span>
                {n.publishOn ? ` · ${formatDate(n.publishOn)}` : ""}
                {n.expiresOn ? ` · Valid till ${formatDate(n.expiresOn)}` : ""}
              </p>
              {n.body && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>}
              {fileUrl(n.attachment) && (
                <a
                  href={fileUrl(n.attachment)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
                >
                  Download attachment
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}