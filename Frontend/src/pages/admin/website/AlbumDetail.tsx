import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { fileUrl } from "@/utils/constants";
import { getErrorMessage } from "@/api/axios";
import {
  getAlbums,
  getAlbumImages,
  uploadAlbumImages,
  deleteGalleryImage,
} from "@/api/content.api";
import type { GalleryAlbum, GalleryImage } from "@/types/content.types";

const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();

  const [album, setAlbum] = useState<GalleryAlbum | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [delImage, setDelImage] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAlbum = useCallback(async () => {
    if (!albumId) return;
    const albums = await getAlbums();
    setAlbum(albums.find((a) => a._id === albumId) || null);
  }, [albumId]);

  const loadImages = useCallback(async () => {
    if (!albumId) return;
    setImagesLoading(true);
    try {
      setImages(await getAlbumImages(albumId));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setImagesLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadAlbum(), loadImages()])
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAlbum, loadImages]);

  // Build preview URLs for selected files; revoke on change/unmount.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const onPick = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    if (arr.length > MAX_FILES) {
      toast.error(`You can upload at most ${MAX_FILES} files at a time`);
      return;
    }
    const invalidType = arr.find((f) => !ALLOWED.includes(f.type));
    if (invalidType) {
      toast.error(`Only jpeg, png, webp and gif images are allowed`);
      return;
    }
    const tooBig = arr.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      toast.error(`Each image must be 5 MB or smaller`);
      return;
    }
    setFiles(arr);
  };

  const clearSelection = () => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async () => {
    if (!albumId || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    try {
      await uploadAlbumImages(albumId, files, setProgress);
      toast.success(`Uploaded ${files.length} image(s)`);
      clearSelection();
      await loadImages();
      await loadAlbum();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const confirmDeleteImage = async () => {
    if (!delImage) return;
    setDeleting(true);
    try {
      await deleteGalleryImage(delImage._id);
      setImages((prev) => prev.filter((i) => i._id !== delImage._id));
      toast.success("Image deleted");
      setDelImage(null);
      await loadAlbum();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const cover = useMemo(() => album?.coverImage || images[0]?.imageUrl, [album, images]);

  if (loading) return <Loader />;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/website/gallery")}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Back to albums
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{album?.title || "Album"}</h1>
            <p className="text-xs text-slate-500">{images.length} images</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => onPick(e.target.files)}
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {uploading ? `Uploading ${progress}%` : "Upload photos"}
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">
            {files.length} file(s) selected (max {MAX_FILES}, 5 MB each)
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <img key={src} src={src} alt={files[i]?.name} className="h-16 w-16 rounded object-cover" />
            ))}
          </div>
          {uploading && (
            <div className="mb-3 h-2 w-full overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearSelection}
              disabled={uploading}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={upload}
              disabled={uploading}
              className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}

      {imagesLoading ? (
        <Loader />
      ) : images.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No images in this album yet. Use “Upload photos” to add some.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img._id} className="overflow-hidden rounded-lg bg-white shadow">
              <img
                src={fileUrl(img.imageUrl)}
                alt={img.caption || "image"}
                className="h-40 w-full object-cover"
              />
              <div className="flex items-center justify-between p-2 text-xs">
                <span className="truncate text-gray-500">{img.caption || ""}</span>
                <button
                  type="button"
                  onClick={() => setDelImage(img)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cover && (
        <p className="mt-4 text-xs text-slate-400">
          Cover: <span className="text-slate-500">{cover.split("/").pop()}</span>
        </p>
      )}

      <ConfirmDialog
        open={!!delImage}
        title="Delete Image"
        message="Delete this image?"
        loading={deleting}
        onConfirm={confirmDeleteImage}
        onCancel={() => setDelImage(null)}
      />
    </div>
  );
}