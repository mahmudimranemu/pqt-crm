"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  maxSize?: number; // in bytes
}

export function FileDropzone({
  onFileSelect,
  accept,
  disabled = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (maxSize && file.size > maxSize) {
        setError(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
        return;
      }
      if (accept) {
        const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!acceptedTypes.includes(ext)) {
          setError(`File type not accepted. Allowed: ${accept}`);
          return;
        }
      }
      onFileSelect(file);
    },
    [accept, maxSize, onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [accept, disabled, handleFile]);

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragOver
            ? "border-[#dc2626] bg-red-50"
            : "border-gray-300 hover:border-gray-400",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <Upload className="mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm font-medium text-gray-600">
          Click to upload or drag & drop
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Max {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
