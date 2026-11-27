import { useSocietySlug } from "@/hooks/useSocietySlug";
import PanelLayout, { type NavItem } from "./PanelLayout";

interface AdminPanelProps {
  title: string;
  links: NavItem[];
}

export default function AdminPanel({ title, links }: AdminPanelProps) {
  const { slug, name, logo } = useSocietySlug();

  return (
    <PanelLayout
      title={title}
      links={links}
      siteSlug={slug}
      siteName={name}
      siteLogo={logo}
    />
  );
}