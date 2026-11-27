import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

interface Tab {
  id: string;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: "line" | "enclosed" | "soft";
}

export const Tabs = ({
  tabs,
  activeTab,
  onChange,
  className = "",
  variant = "line",
}: TabsProps) => {
  const variantStyles = {
    line: "border-b border-slate-200",
    enclosed: "bg-slate-100 rounded-xl p-1",
    soft: "bg-transparent",
  };

  const tabStyles = {
    line: (active: boolean) =>
      `px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
      }`,
    enclosed: (active: boolean) =>
      `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`,
    soft: (active: boolean) =>
      `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
      }`,
  };

  return (
    <div className={className} role="tablist">
      <div className={variantStyles[variant]}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={`
              flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${tabStyles[variant](activeTab === tab.id)}
            `}
          >
            {tab.icon && <Icon name={tab.icon} size={16} />}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export const TabPanel = ({ id, children, className = "" }: TabPanelProps) => (
  <div role="tabpanel" id={`panel-${id}`} className={`mt-4 ${className}`}>
    {children}
  </div>
);

Tabs.displayName = "Tabs";
TabPanel.displayName = "TabPanel";