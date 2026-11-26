import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fileUrl } from "@/utils/constants";

interface Props {
  value?: string;
  onChange: (file: File | null) => void;
  label?: string;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX = 5 * 1024 * 1024;

export default function ImagePicker({ value, onChange, label = "Image" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value ? fileUrl(value) : "");

  useEffect(() => {
    setPreview(value ? fileUrl(value) : "");
  }, [value]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handle = (file?: File) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only jpeg, png, webp and gif images are allowed");
      return;
    }
    if (file.size > MAX) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file);
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border bg-gray-50">
          {preview ? (
            <img src={preview} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handle(e.target.files?.[0])}
          className="text-sm"
        />
      </div>
    </div>
  );
}