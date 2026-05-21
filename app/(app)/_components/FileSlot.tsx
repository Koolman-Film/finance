"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText, Loader2, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getEntryFileSignedUrl } from "@/lib/file-actions";

import type { EntryFileLite } from "./types";

type Props = {
  label: string;
  /// The single existing file in this slot (server-side), or null if none.
  existing: EntryFileLite | null;
  /// A file the user has staged but not yet uploaded (pending save).
  pendingFile: File | null;
  /// True if the user has marked the existing file for deletion (pending save).
  pendingDelete: boolean;
  onSelectFile: (file: File | null) => void;
  onMarkDeleted: () => void;
  onUnmarkDeleted: () => void;
  disabled?: boolean;
};

function humanSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileSlot({
  label,
  existing,
  pendingFile,
  pendingDelete,
  onSelectFile,
  onMarkDeleted,
  onUnmarkDeleted,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [opening, startOpening] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openExisting() {
    if (!existing) return;
    setError(null);
    startOpening(async () => {
      const res = await getEntryFileSignedUrl(existing.id);
      if (res.ok && "url" in res) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>

      {existing && !pendingDelete && !pendingFile && (
        <div className="bg-background flex items-center gap-2 rounded-md border p-2 text-sm">
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <span className="flex-1 truncate" title={existing.originalName}>
            {existing.originalName}
          </span>
          <span className="text-muted-foreground text-xs">{humanSize(existing.sizeBytes)}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={openExisting}
            disabled={opening}
            title="เปิดดู"
          >
            {opening ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onMarkDeleted}
            disabled={disabled}
            title="ลบเมื่อบันทึก"
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      )}

      {existing && pendingDelete && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-md border p-2 text-sm">
          <Trash2 className="size-4 shrink-0" />
          <span className="flex-1 truncate line-through" title={existing.originalName}>
            {existing.originalName}
          </span>
          <span className="text-xs">จะถูกลบเมื่อบันทึก</span>
          <Button type="button" size="sm" variant="outline" onClick={onUnmarkDeleted}>
            ยกเลิก
          </Button>
        </div>
      )}

      {pendingFile && (
        <div className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-md border p-2 text-sm">
          <Upload className="text-primary size-4 shrink-0" />
          <span className="flex-1 truncate" title={pendingFile.name}>
            {pendingFile.name}
          </span>
          <span className="text-muted-foreground text-xs">{humanSize(pendingFile.size)}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onSelectFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            title="ยกเลิก"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {!pendingFile && (!existing || pendingDelete) && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={disabled}
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
          className="file:border-input file:bg-secondary file:text-secondary-foreground file:hover:bg-secondary/80 block w-full text-sm file:mr-3 file:rounded file:border file:px-3 file:py-1"
        />
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
