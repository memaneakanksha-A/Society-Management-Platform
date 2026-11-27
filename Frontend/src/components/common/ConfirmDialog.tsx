import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  confirmVariant?: "red" | "danger" | "indigo";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Delete",
  confirmVariant = "red",
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass =
    confirmVariant === "indigo"
      ? "bg-indigo-600 hover:bg-indigo-700"
      : "bg-red-600 hover:bg-red-700";
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded px-4 py-2 text-sm text-white disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? "Deleting..." : confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message || "Are you sure? This action cannot be undone."}</p>
    </Modal>
  );
}