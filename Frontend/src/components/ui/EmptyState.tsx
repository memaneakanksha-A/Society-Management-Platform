import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon = "file",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) => {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-10 text-center ${className}`}>
      <div className="mx-auto mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

EmptyState.displayName = "EmptyState";