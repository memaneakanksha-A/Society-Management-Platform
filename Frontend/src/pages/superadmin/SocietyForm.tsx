import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { createSociety, getSociety, updateSociety } from "@/api/superadmin.api";
import { getErrorMessage } from "@/api/axios";
import type { SocietyFormData } from "@/types/society.types";
import { slugify } from "@/utils/constants";

const empty: SocietyFormData = {
  name: "",
  slug: "",
  address: "",
  totalHouses: 0,
  phone: "",
  email: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export default function SocietyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<SocietyFormData>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSociety(id)
      .then((s) =>
        setForm({
          ...empty,
          name: s.name,
          slug: s.slug,
          address: s.address || "",
          totalHouses: s.totalHouses,
          phone: s.contact?.phone || "",
          email: s.contact?.email || "",
        })
      )
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === "number" ? Number(value) : value };
      if (name === "name" && !isEdit) next.slug = slugify(value);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && id) {
        await updateSociety(id, form);
        toast.success("Society updated");
      } else {
        await createSociety(form);
        toast.success("Society created");
      }
      navigate("/superadmin/societies");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, name: keyof SocietyFormData, type = "text", required = false) => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        value={form[name]}
        onChange={handleChange}
        className="w-full rounded border px-3 py-2 outline-none focus:border-indigo-500"
      />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">{isEdit ? "Edit Society" : "Add Society"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="font-medium text-gray-700">Society details</h2>
        {field("Society Name", "name", "text", true)}
        {field("Slug (website URL name)", "slug", "text", true)}
        {field("Address", "address")}
        {field("Total Houses", "totalHouses", "number")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("Contact Phone", "phone")}
          {field("Contact Email", "email", "email")}
        </div>

        {!isEdit && (
          <>
            <h2 className="pt-2 font-medium text-gray-700">Society admin login</h2>
            {field("Admin Name", "adminName", "text", true)}
            {field("Admin Email", "adminEmail", "email", true)}
            {field("Admin Password", "adminPassword", "password", true)}
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/superadmin/societies")}
            className="rounded border px-5 py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}