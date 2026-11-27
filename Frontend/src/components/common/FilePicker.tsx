import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fileUrl } from "@/utils/constants";

type Accept = "image" | "pdf" | "both";

interface Props {
  value?: string;
  onChange: (file: File | null) => void;
  label?: string;
  accept?: Accept;
}

const MAX = 5 * 1024 * 1024;

const acceptAttr = (accept: Accept): string => {
  if (accept === "image") return "image/jpeg,image/png,image/webp,image/gif";
  if (accept === "pdf") return "application/pdf";
  return "image/jpeg,image/png,image/webp,image/gif,application/pdf";
};

export default function FilePicker({ value, onChange, label = "File", accept = "both" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value ? fileUrl(value) : "");
  const [fileName, setFileName] = useState<string>("");

  useEffect(() => {
    setPreview(value ? fileUrl(value) : "");
    setFileName("");
  }, [value]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handle = (file?: File) => {
    if (!file) return;
    const okType =
      accept === "image"
        ? file.type.startsWith("image/")
        : accept === "pdf"
        ? file.type === "application/pdf"
        : file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType) {
      toast.error(
        accept === "pdf"
          ? "Only PDF files are allowed"
          : accept === "image"
          ? "Only images are allowed"
          : "Only images or PDF files are allowed"
      );
      return;
    }
    if (file.size > MAX) {
      toast.error("File must be 5 MB or smaller");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setFileName(file.name);
    onChange(file);
  };

  const currentName = fileName || (value ? value.split("/").pop() : "");
  const isPdf = (fileName || value || "").toLowerCase().endsWith(".pdf");

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border bg-gray-50">
          {preview && !isPdf ? (
            <img src={preview} alt="preview" className="h-full w-full object-cover" />
          ) : preview ? (
            <span className="px-1 text-center text-[10px] font-medium text-red-600">PDF</span>
          ) : (
            <span className="text-xs text-gray-400">No file</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttr(accept)}
            onChange={(e) => handle(e.target.files?.[0])}
            className="text-sm"
          />
          {currentName && <span className="max-w-[12rem] truncate text-xs text-gray-400">{currentName}</span>}
        </div>
      </div>
    </div>
  );
}