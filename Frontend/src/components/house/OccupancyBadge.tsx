import Badge from "@/components/common/Badge";
import type { OccupancyStatus } from "@/types/house.types";

const map: Record<OccupancyStatus, { variant: "green" | "amber" | "gray"; label: string }> = {
  owner_living: { variant: "green", label: "Owner living" },
  rented: { variant: "amber", label: "Rented" },
  vacant: { variant: "gray", label: "Vacant" },
};

export default function OccupancyBadge({ status }: { status: OccupancyStatus }) {
  const cfg = map[status] || map.vacant;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}