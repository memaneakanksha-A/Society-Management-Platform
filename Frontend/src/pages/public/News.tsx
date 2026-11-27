import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSociety } from "@/context/SocietyContext";
import { getPublicNews, getPublicNewsItem } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import { fileUrl } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";
import Loader from "@/components/common/Loader";
import type { PublicNews } from "@/types/public.types";

function NewsDetail({ slug, id }: { slug: string; id: string }) {
  const [news, setNews] = useState<PublicNews | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPublicNewsItem(slug, id)
      .then((n) => {
        if (active) setNews(n);
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
  }, [slug, id]);

  if (loading) return <Loader />;
  if (!news) return <p className="text-gray-500">News not found.</p>;

  return (
    <article className="space-y-4">
      <Link to={`/s/${slug}/news`} className="text-sm text-indigo-600 hover:underline">
        ← Back to news
      </Link>
      <h1 className="text-2xl font-semibold text-gray-900">{news.title}</h1>
      <p className="text-sm text-gray-500">{formatDate(news.date)}</p>
      {fileUrl(news.image) && (
        <img src={fileUrl(news.image)} alt={news.title} className="w-full rounded-lg object-cover" />
      )}
      {news.summary && <p className="text-lg text-gray-700">{news.summary}</p>}
      <div className="whitespace-pre-wrap text-gray-700">{news.body}</div>
    </article>
  );
}

function NewsCard({ slug, item }: { slug: string; item: PublicNews }) {
  return (
    <Link
      to={`/s/${slug}/news/${item._id}`}
      className="group overflow-hidden rounded-lg bg-white shadow"
    >
      {fileUrl(item.image) && (
        <div className="h-40 w-full bg-gray-100">
          <img src={fileUrl(item.image)} alt={item.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
        <p className="mt-1 font-medium text-gray-900 group-hover:text-indigo-600">{item.title}</p>
        {item.summary && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{item.summary}</p>}
      </div>
    </Link>
  );
}

export default function PublicNews() {
  const { society } = useSociety();
  const { id } = useParams();
  const slug = society?.slug ?? "";

  const [items, setItems] = useState<PublicNews[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || id) return;
    let active = true;
    setLoading(true);
    getPublicNews(slug, page)
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
  }, [slug, id, page]);

  if (!society) return <Loader />;
  if (id) return <NewsDetail slug={slug} id={id} />;
  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">News</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">No news yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <NewsCard key={item._id} slug={slug} item={item} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {pages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}