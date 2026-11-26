interface PaginationProps {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, pages, onPage }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-sm text-gray-500">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}