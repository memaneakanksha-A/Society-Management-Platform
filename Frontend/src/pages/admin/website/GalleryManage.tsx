import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ImagePicker from "@/components/common/ImagePicker";
import { fileUrl } from "@/utils/constants";
import { getErrorMessage } from "@/api/axios";
import {
  getAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumImages,
  uploadAlbumImages,
  deleteGalleryImage,
} from "@/api/content.api";
import type { GalleryAlbum, GalleryImage } from "@/types/content.types";

export default function GalleryManage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryAlbum | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });

  const [delAlbum, setDelAlbum] = useState<GalleryAlbum | null>(null);
  const [selected, setSelected] = useState<GalleryAlbum | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [delImage, setDelImage] = useState<GalleryImage | null>(null);

  const loadAlbums = () => {
    setLoading(true);
    getAlbums()
      .then(setAlbums)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(loadAlbums, []);

  const openAlbum = async (a: GalleryAlbum) => {
    setSelected(a);
    setImagesLoading(true);
    try {
      setImages(await getAlbumImages(a._id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setImagesLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFile(null);
    setForm({ title: "", description: "" });
    setOpen(true);
  };

  const openEdit = (a: GalleryAlbum) => {
    setEditing(a);
    setFile(null);
    setForm({ title: a.title, description: a.description || "" });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.description) fd.append("description", form.description.trim());
      if (file) fd.append("cover", file);
      if (editing) await updateAlbum(editing._id, fd);
      else await createAlbum(fd);
      toast.success(editing ? "Album updated" : "Album created");
      setOpen(false);
      loadAlbums();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAlbum = async () => {
    if (!delAlbum) return;
    setSaving(true);
    try {
      await deleteAlbum(delAlbum._id);
      toast.success("Album deleted");
      setDelAlbum(null);
      loadAlbums();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selected) return;
    setSaving(true);
    try {
      const arr = Array.from(files);
      const added = await uploadAlbumImages(selected._id, arr);
      setImages((prev) => [...prev, ...added]);
      toast.success(`Uploaded ${added.length} image(s)`);
      loadAlbums();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteImage = async () => {
    if (!delImage) return;
    setSaving(true);
    try {
      await deleteGalleryImage(delImage._id);
      setImages((prev) => prev.filter((i) => i._id !== delImage._id));
      toast.success("Image deleted");
      setDelImage(null);
      loadAlbums();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  if (selected) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Back
            </button>
            <h1 className="text-2xl font-semibold">{selected.title}</h1>
          </div>
          <label className="cursor-pointer rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            {saving ? "Uploading..." : "Upload Images"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
              disabled={saving}
            />
          </label>
        </div>

        {imagesLoading ? (
          <Loader />
        ) : images.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
            No images in this album yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <div key={img._id} className="overflow-hidden rounded-lg bg-white shadow">
                <img src={fileUrl(img.imageUrl)} alt={img.caption || "image"} className="h-40 w-full object-cover" />
                <div className="flex items-center justify-between p-2 text-xs">
                  <span className="truncate text-gray-500">{img.caption || ""}</span>
                  <button
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

        <ConfirmDialog
          open={!!delImage}
          title="Delete Image"
          message="Delete this image?"
          loading={saving}
          onConfirm={confirmDeleteImage}
          onCancel={() => setDelImage(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gallery</h1>
        <button
          onClick={openAdd}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + New Album
        </button>
      </div>

      {albums.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">No albums yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => (
            <div key={a._id} className="overflow-hidden rounded-lg bg-white shadow">
              <button onClick={() => openAlbum(a)} className="block w-full text-left">
                <div className="h-40 w-full bg-gray-100">
                  {fileUrl(a.coverImage) ? (
                    <img src={fileUrl(a.coverImage)} alt={a.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-gray-400">{a.imageCount} images</p>
                </div>
              </button>
              <div className="flex gap-3 border-t px-3 py-2 text-sm">
                <button onClick={() => openEdit(a)} className="text-indigo-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => setDelAlbum(a)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? "Edit Album" : "New Album"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !form.title.trim()}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <ImagePicker value={editing?.coverImage} onChange={setFile} label="Cover (optional)" />
          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delAlbum}
        title="Delete Album"
        message={`Delete "${delAlbum?.title}" and all its images?`}
        loading={saving}
        onConfirm={confirmDeleteAlbum}
        onCancel={() => setDelAlbum(null)}
      />
    </div>
  );
}