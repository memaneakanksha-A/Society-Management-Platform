import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSociety } from "@/context/SocietyContext";
import { getGallery, getAlbum } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import { fileUrl } from "@/utils/constants";
import Loader from "@/components/common/Loader";
import type { GalleryAlbum, GalleryImage } from "@/types/public.types";

function AlbumGrid({ slug, albums }: { slug: string; albums: GalleryAlbum[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((a) => (
        <Link
          key={a._id}
          to={`/s/${slug}/gallery/${a._id}`}
          className="group overflow-hidden rounded-lg bg-white shadow"
        >
          <div className="h-40 w-full bg-gray-100">
            {fileUrl(a.coverImage) ? (
              <img
                src={fileUrl(a.coverImage)}
                alt={a.title}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="p-4">
            <p className="font-medium text-gray-900 group-hover:text-indigo-600">{a.title}</p>
            {a.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{a.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">{a.imageCount} photos</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function AlbumDetail({ slug, albumId }: { slug: string; albumId: string }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAlbum(slug, albumId)
      .then((data) => {
        if (!active) return;
        setTitle(data.album.title);
        setImages(data.images);
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
  }, [slug, albumId]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft")
        setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <Link to={`/s/${slug}/gallery`} className="text-sm text-indigo-600 hover:underline">
          Back to gallery
        </Link>
      </div>

      {images.length === 0 ? (
        <p className="text-gray-500">No images in this album yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <button
              key={img._id}
              type="button"
              onClick={() => setLightbox(i)}
              className="overflow-hidden rounded-lg bg-gray-100"
            >
              <img
                src={fileUrl(img.imageUrl)}
                alt={img.caption || `Photo ${i + 1}`}
                className="h-40 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length))}
            className="absolute left-3 rounded-full bg-white/80 px-3 py-1 text-gray-800"
          >
            &#8249;
          </button>
          <img
            src={fileUrl(images[lightbox].imageUrl)}
            alt={images[lightbox].caption || "Photo"}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images[lightbox].caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-sm text-white">
              {images[lightbox].caption}
            </p>
          )}
          <button
            type="button"
            onClick={() => setLightbox((i) => (i === null ? i : (i + 1) % images.length))}
            className="absolute right-3 rounded-full bg-white/80 px-3 py-1 text-gray-800"
          >
            &#8250;
          </button>
        </div>
      )}
    </div>
  );
}

export default function Gallery() {
  const { society } = useSociety();
  const { albumId } = useParams();
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  const slug = society?.slug ?? "";

  useEffect(() => {
    if (!slug || albumId) return;
    let active = true;
    setLoading(true);
    getGallery(slug)
      .then((a) => {
        if (active) setAlbums(a);
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
  }, [slug, albumId]);

  if (!society) return <Loader />;
  if (albumId) return <AlbumDetail slug={slug} albumId={albumId} />;
  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Gallery</h1>
      {albums.length === 0 ? (
        <p className="text-gray-500">No albums yet.</p>
      ) : (
        <AlbumGrid slug={slug} albums={albums} />
      )}
    </div>
  );
}