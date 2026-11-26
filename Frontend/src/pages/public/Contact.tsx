import { useSociety } from "@/context/SocietyContext";
import Loader from "@/components/common/Loader";

const isEmbeddable = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.startsWith("https://www.google.com/maps") ||
    url.startsWith("https://maps.google.com")
  );
};

export default function Contact() {
  const { society, loading } = useSociety();

  if (loading || !society) return <Loader />;

  const { contact } = society;
  const mapUrl = contact?.mapUrl;
  const embedSrc = isEmbeddable(mapUrl)
    ? `https://maps.google.com/maps?q=${encodeURIComponent(
        society.address || society.name
      )}&z=14&output=embed`
    : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Contact</h1>

      <div className="space-y-2 rounded-lg bg-white p-5 shadow">
        {society.address && (
          <p className="text-gray-700">
            <span className="font-medium">Address: </span>
            {society.address}
          </p>
        )}
        {contact?.phone && (
          <p className="text-gray-700">
            <span className="font-medium">Phone: </span>
            <a href={`tel:${contact.phone}`} className="text-indigo-600 hover:underline">
              {contact.phone}
            </a>
          </p>
        )}
        {contact?.email && (
          <p className="text-gray-700">
            <span className="font-medium">Email: </span>
            <a
              href={`mailto:${contact.email}`}
              className="text-indigo-600 hover:underline"
            >
              {contact.email}
            </a>
          </p>
        )}
        {society.officeTime && (
          <p className="whitespace-pre-line text-gray-700">
            <span className="font-medium">Office Time: </span>
            {society.officeTime}
          </p>
        )}
      </div>

      {embedSrc ? (
        <iframe
          title={`Map of ${society.name}`}
          src={embedSrc}
          className="h-72 w-full rounded-lg border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-indigo-600 hover:underline"
        >
          Open in Maps
        </a>
      ) : null}
    </div>
  );
}