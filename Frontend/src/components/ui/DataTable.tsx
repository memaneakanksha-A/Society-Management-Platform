import type { ReactNode, HTMLAttributes } from "react";
import { Icon, type IconName } from "./icons";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  emptyIcon?: IconName;
  emptyAction?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  striped?: boolean;
  hoverable?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data found.",
  emptyIcon = "file",
  emptyAction,
  loading = false,
  loadingRows = 5,
  striped = true,
  hoverable = true,
  onRowClick,
  className = "",
  ...props
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" {...props}>
            <thead className="bg-slate-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.headerClassName || ""}`}
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i} className={i % 2 === 0 && striped ? "bg-slate-50" : ""}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
          <Icon name={emptyIcon} size={28} />
        </div>
        <p className="text-slate-500">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" {...props}>
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.headerClassName || ""}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row)}
                className={`
                  transition-colors
                  ${striped && rowIndex % 2 === 0 ? "bg-slate-50" : ""}
                  ${hoverable ? "hover:bg-slate-50" : ""}
                  ${onRowClick ? "cursor-pointer" : ""}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-slate-700 ${col.className || ""}`}
                  >
                    {col.render ? col.render(row, rowIndex) : String((row as any)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

DataTable.displayName = "DataTable";