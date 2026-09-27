"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "./Button";

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  hash?: string;
}

export interface FileUploadProps {
  label?: string;
  helperText?: string;
  error?: string;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  onFilesChange?: (files: UploadedFileItem[]) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = "Upload Evidence Documents",
  helperText = "Supported formats: PDF, JPG, PNG up to 10MB per file",
  error: customError,
  accept = ".pdf,.png,.jpg,.jpeg",
  maxSizeMB = 10,
  maxFiles = 5,
  onFilesChange,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Mock cryptographic hash for evidence auditability preview
  const generateMockHash = (name: string, size: number): string => {
    const raw = `${name}_${size}_${Date.now()}`;
    let hash = "0x";
    for (let i = 0; i < 16; i++) {
      hash += Math.floor(Math.random() * 16).toString(16);
    }
    return hash + "...hash";
  };

  const processFiles = (newFiles: FileList | File[]) => {
    setErrorMessage(null);
    const validItems: UploadedFileItem[] = [];

    if (files.length + newFiles.length > maxFiles) {
      setErrorMessage(`You can upload a maximum of ${maxFiles} files.`);
      return;
    }

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];

      if (file.size > maxSizeMB * 1024 * 1024) {
        setErrorMessage(
          `File "${file.name}" exceeds the ${maxSizeMB}MB size limit.`
        );
        return;
      }

      validItems.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        hash: generateMockHash(file.name, file.size),
      });
    }

    const updated = [...files, ...validItems];
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const handleRemove = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className={cn("w-full space-y-3 text-left", className)}>
      {label && (
        <span className="block text-xs font-semibold text-dark-800 select-none">
          {label}
        </span>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Upload files dropzone"
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          isDragging
            ? "border-primary-600 bg-primary-50/50 scale-[1.005]"
            : "border-border hover:border-dark-300 bg-dark-50/50 hover:bg-dark-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="w-12 h-12 rounded-2xl bg-surface border border-border text-primary-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <UploadCloud className="w-6 h-6 stroke-[1.8]" />
        </div>

        <p className="text-sm font-semibold text-dark-800">
          Click to upload <span className="font-normal text-dark-500">or drag and drop</span>
        </p>
        <p className="text-xs text-dark-500 mt-1">{helperText}</p>
      </div>

      {/* Errors */}
      {(errorMessage || customError) && (
        <p className="text-xs font-medium text-danger-600 flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage || customError}
        </p>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-dark-500 uppercase tracking-wider block">
            Attached Evidence ({files.length}/{maxFiles})
          </span>

          <div className="divide-y divide-border/60 rounded-xl border border-border bg-surface overflow-hidden">
            {files.map((file) => {
              const isImage = file.type.startsWith("image/");

              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-dark-50 border border-dark-200/60 text-dark-600 shrink-0">
                      {isImage ? (
                        <ImageIcon className="w-4 h-4 text-primary-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-dark-900 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-dark-400">
                        <span>{formatFileSize(file.size)}</span>
                        <span>&middot;</span>
                        <span className="font-mono text-dark-500">
                          {file.hash}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(file.id);
                    }}
                    className="p-1 rounded-lg text-dark-400 hover:text-danger-600 hover:bg-danger-50 transition shrink-0"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
