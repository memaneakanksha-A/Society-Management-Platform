import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loader from "@/components/common/Loader";
import ImagePicker from "@/components/common/ImagePicker";
import { getErrorMessage } from "@/api/axios";
import { getSettings, updateSettings, uploadLogo } from "@/api/content.api";

export default function AboutManage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [about, setAbout] = useState("");
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setAbout(s.about || "");
        setLogo(s.logo);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (file) {
        const url = await uploadLogo(file);
        setLogo(url);
        setFile(null);
      }
      await updateSettings({ about });
      toast.success("About saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">About</h1>
      <div className="max-w-2xl space-y-4 rounded-lg bg-white p-5 shadow">
        <ImagePicker value={logo} onChange={setFile} label="Society Logo" />
        <div>
          <label className="mb-1 block text-sm font-medium">About</label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={8}
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