import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useSociety } from "@/context/SocietyContext";
import { getHome, getGallery } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import { fileUrl } from "@/utils/constants";
import Loader from "@/components/common/Loader";
import type {
  Banner,
  BodyMember,
  GalleryAlbum,
  PublicNews,
  PublicEvent,
  PublicNotice,
} from "@/types/public.types";
import { formatDate } from "@/utils/formatDate";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberCard({ member }: { member: BodyMember }) {
  const photo = fileUrl(member.photo);
  return (
    <div className="flex flex-col items-center rounded-lg bg-white p-4 text-center shadow">
      {photo ? (
        <img
          src={photo}
          alt={member.name}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700">
          {initials(member.name)}
        </span>
      )}
      <p className="mt-3 font-medium text-gray-900">{member.name}</p>
      <p className="text-sm text-gray-500">{member.designation}</p>
      {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
      {member.email && <p className="text-xs text-gray-400">{member.email}</p>}
    </div>
  );
}

function BannerCarousel({ banners, name }: { banners: Banner[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, banners.length]);

  if (banners.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-center text-white sm:h-80">
        <h1 className="px-4 text-3xl font-bold sm:text-4xl">{name}</h1>
        <p className="mt-2 text-indigo-100">Welcome to our society website</p>
      </div>
    );
  }

  const current = banners[index];
  const go = (dir: number) =>
    setIndex((i) => (i + dir + banners.length) % banners.length);

  return (
    <div
      className="relative h-64 overflow-hidden rounded-xl sm:h-80"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <img
        src={fileUrl(current.image)}
        alt={current.title}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="text-2xl font-bold sm:text-4xl">{current.title}</h1>
        {current.subtitle && <p className="mt-2 text-sm sm:text-lg">{current.subtitle}</p>}
      </div>

      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-gray-800 hover:bg-white"
        aria-label="Previous"
      >
        &#8249;
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-gray-800 hover:bg-white"
        aria-label="Next"
      >
        &#8250;
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full ${
              i === index ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { society } = useSociety();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [members, setMembers] = useState<BodyMember[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [news, setNews] = useState<PublicNews[]>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const slug = society?.slug ?? "";

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    Promise.all([getHome(slug), getGallery(slug)])
      .then(([home, gal]) => {
        if (!active) return;
        setBanners(home.banners);
        setMembers(home.members);
        setAlbums(gal);
        setNews(home.news ?? []);
        setEvents(home.events ?? []);
        setNotices(home.notices ?? []);
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
  }, [slug]);

  if (loading || !society) return <Loader />;

  return (
    <div className="space-y-10">
      <BannerCarousel banners={banners} name={society.name} />

      {society.about && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">About</h2>
            <Link
              to={`/s/${society.slug}/about`}
              className="text-sm text-indigo-600 hover:underline"
            >
              Read more
            </Link>
          </div>
          <p className="whitespace-pre-line text-gray-600">{society.about}</p>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Body Members</h2>
          <Link
            to={`/s/${society.slug}/members`}
            className="text-sm text-indigo-600 hover:underline"
          >
            View all
          </Link>
        </div>
        {members.length === 0 ? (
          <p className="text-gray-500">No members listed yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {members.slice(0, 4).map((m) => (
              <MemberCard key={m.name + m.designation} member={m} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Gallery</h2>
          <Link
            to={`/s/${society.slug}/gallery`}
            className="text-sm text-indigo-600 hover:underline"
          >
            View all
          </Link>
        </div>
        {albums.length === 0 ? (
          <p className="text-gray-500">No albums yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {albums.slice(0, 4).map((a) => (
              <Link
                key={a._id}
                to={`/s/${society.slug}/gallery/${a._id}`}
                className="group overflow-hidden rounded-lg bg-white shadow"
              >
                <div className="h-32 w-full bg-gray-100">
                  {fileUrl(a.coverImage) ? (
                    <img
                      src={fileUrl(a.coverImage)}
                      alt={a.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="font-medium text-gray-900 group-hover:text-indigo-600">
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-400">{a.imageCount} photos</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {notices.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Notices</h2>
            <Link to={`/s/${society.slug}/notices`} className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {notices.slice(0, 3).map((n) => (
              <div key={n._id} className={`rounded-lg bg-white p-3 shadow ${n.isImportant ? "border-l-4 border-amber-400" : ""}`}>
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-400">
                  {n.publishOn ? formatDate(n.publishOn) : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">News</h2>
            <Link to={`/s/${society.slug}/news`} className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {news.map((n) => (
              <Link key={n._id} to={`/s/${society.slug}/news/${n._id}`} className="group rounded-lg bg-white p-4 shadow">
                <p className="text-xs text-gray-400">{formatDate(n.date)}</p>
                <p className="mt-1 font-medium text-gray-900 group-hover:text-indigo-600">{n.title}</p>
                {n.summary && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{n.summary}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
            <Link to={`/s/${society.slug}/events`} className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {events.map((e) => (
              <div key={e._id} className="rounded-lg bg-white p-4 shadow">
                <p className="text-xs font-medium text-indigo-600">{formatDate(e.date)}</p>
                <p className="mt-1 font-medium text-gray-900">{e.title}</p>
                <p className="text-sm text-gray-500">{[e.time, e.venue].filter(Boolean).join(" · ") || "Details coming soon"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {notices.length === 0 && news.length === 0 && events.length === 0 && (
        <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-400">
          Updates will appear here soon
        </section>
      )}
    </div>
  );
}