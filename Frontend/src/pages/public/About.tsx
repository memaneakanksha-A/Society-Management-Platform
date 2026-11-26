import { useSociety } from "@/context/SocietyContext";
import Loader from "@/components/common/Loader";

export default function About() {
  const { society, loading } = useSociety();

  if (loading || !society) return <Loader />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">About {society.name}</h1>
      {society.about ? (
        <p className="whitespace-pre-line leading-relaxed text-gray-600">{society.about}</p>
      ) : (
        <p className="text-gray-500">Information about this society is not available yet.</p>
      )}
    </div>
  );
}