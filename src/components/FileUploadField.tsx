"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Check, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
  label: string;
  purpose: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
}

export function FileUploadField({
  label,
  purpose,
  value,
  onChange,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      onChange(data.file.url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const filename = value ? value.split("/").pop() : null;

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{label}</label>
      <div className="flex gap-2">
        <div
          className={cn(
            "flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border bg-gray-50 min-h-[48px]",
            value ? "border-green-200 bg-green-50/50" : "border-gray-200"
          )}
        >
          {value ? (
            <>
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm text-gray-700 truncate">{filename}</span>
              {value.match(/\.(jpg|jpeg|png|webp)$/i) && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 ml-auto shrink-0 hover:underline"
                >
                  Preview
                </a>
              )}
            </>
          ) : (
            <span className="text-sm text-muted">No file uploaded</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-1 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : value ? (
            <FileText className="w-5 h-5" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">{value ? "Replace" : "Upload"}</span>
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
