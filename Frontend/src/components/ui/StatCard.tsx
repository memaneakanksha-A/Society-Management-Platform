import { Icon, type IconName } from "./icons";

type StatColor = "indigo" | "green" | "amber" | "red" | "blue" | "purple" | "gray";

const colorStyles: Record<StatColor, { bg: string; icon: string; border: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-100" },
  green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100" },
  red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-100" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-100" },
  gray: { bg: "bg-slate-50", icon: "text-slate-600", border: "border-slate-100" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconName;
  color?: StatColor;
  trend?: { value: string; up?: boolean };
  subtext?: string;
  className?: string;
}

export const StatCard = ({
  label,
  value,
  icon,
  color = "indigo",
  trend,
  subtext,
  className = "",
}: StatCardProps) => {
  const styles = colorStyles[color];
  return (
    <div className={`rounded-2xl border p-5 ${styles.border} ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
          {trend && (
            <p className="mt-1.5 flex items-center gap-1 text-sm">
              <Icon name={trend.up ? "trendingUp" : "trendingDown"} size={14} className={trend.up ? "text-green-600" : "text-red-600"} />
              <span className={trend.up ? "text-green-600" : "text-red-600"}>{trend.value}</span>
            </p>
          )}
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </div>
        <div className={`rounded-xl p-3 ${styles.bg}`}>
          <Icon name={icon} size={22} className={styles.icon} />
        </div>
      </div>
    </div>
  );
};

StatCard.displayName = "StatCard";