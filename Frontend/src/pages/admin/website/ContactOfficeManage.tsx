import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import { getErrorMessage } from "@/api/axios";
import { getSettings, updateSettings } from "@/api/content.api";

export default function ContactOfficeManage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    address: "",
    phone: "",
    email: "",
    mapUrl: "",
    officeTime: "",
  });

  useEffect(() => {
    getSettings()
      .then((s) =>
        setForm({
          address: s.address || "",
          phone: s.contact?.phone || "",
          email: s.contact?.email || "",
          mapUrl: s.contact?.mapUrl || "",
          officeTime: s.officeTime || "",
        })
      )
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        address: form.address,
        officeTime: form.officeTime,
        contact: {
          phone: form.phone,
          email: form.email,
          mapUrl: form.mapUrl,
        },
      });
      toast.success("Contact & office time saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Contact &amp; Office Time</h1>
      <div className="max-w-2xl space-y-4 rounded-lg bg-white p-5 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Google Maps URL</label>
          <input
            value={form.mapUrl}
            onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            The map URL should start with https://www.google.com/maps
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Office Time</label>
          <textarea
            value={form.officeTime}
            onChange={(e) => setForm({ ...form, officeTime: e.target.value })}
            rows={3}
            placeholder="Mon-Sat 10:00 AM - 6:00 PM"
            className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}