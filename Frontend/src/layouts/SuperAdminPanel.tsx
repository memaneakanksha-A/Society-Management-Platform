import PanelLayout, { type NavItem } from "./PanelLayout";

interface SuperAdminPanelProps {
  title: string;
  links: NavItem[];
}

export default function SuperAdminPanel({ title, links }: SuperAdminPanelProps) {
  return <PanelLayout title={title} links={links} />;
}