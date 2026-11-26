import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSociety } from "@/context/SocietyContext";
import { getMembers } from "@/api/public.api";
import { getErrorMessage } from "@/api/axios";
import { fileUrl } from "@/utils/constants";
import Loader from "@/components/common/Loader";
import type { BodyMember } from "@/types/public.types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function BodyMembers() {
  const { society } = useSociety();
  const [members, setMembers] = useState<BodyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const slug = society?.slug ?? "";

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    getMembers(slug)
      .then((m) => {
        if (active) setMembers(m);
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Body Members</h1>
      {members.length === 0 ? (
        <p className="text-gray-500">No members listed yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m) => {
            const photo = fileUrl(m.photo);
            return (
              <div
                key={m.name + m.designation}
                className="flex flex-col items-center rounded-lg bg-white p-4 text-center shadow"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={m.name}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700">
                    {initials(m.name)}
                  </span>
                )}
                <p className="mt-3 font-medium text-gray-900">{m.name}</p>
                <p className="text-sm text-gray-500">{m.designation}</p>
                {m.phone && (
                  <a
                    href={`tel:${m.phone}`}
                    className="mt-1 text-xs text-indigo-600 hover:underline"
                  >
                    {m.phone}
                  </a>
                )}
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {m.email}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}