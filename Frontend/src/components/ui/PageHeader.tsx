import type { ReactNode } from "react";
import { Icon } from "./icons";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className = "",
}: PageHeaderProps) => {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <Icon name="chevronRight" size={14} className="text-slate-300" />}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-slate-700 transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="font-medium text-slate-900">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

PageHeader.displayName = "PageHeader";