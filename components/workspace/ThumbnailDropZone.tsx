"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { PANE2_SCHEDULE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ThumbnailDropZoneProps = {
  entryId: string;
  imageUrl: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
};

export function ThumbnailDropZone({
  entryId,
  imageUrl,
  onUploaded,
  onClear,
}: ThumbnailDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.set("entryId", entryId);
        form.set("file", file);

        const res = await fetch("/api/thumbnails", {
          method: "POST",
          body: form,
        });
        const raw = await res.text();
        let json: { url?: string; error?: string } = {};
        if (raw) {
          try {
            json = JSON.parse(raw) as { url?: string; error?: string };
          } catch {
            throw new Error(
              `サーバー応答が不正です（${res.status}）。時間をおいて再試行してください。`,
            );
          }
        }
        if (!res.ok || !json.url) {
          throw new Error(
            json.error ??
              (res.ok
                ? "アップロードに失敗しました"
                : `アップロードに失敗しました（${res.status}）`),
          );
        }
        onUploaded(json.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "アップロードに失敗しました");
      } finally {
        setUploading(false);
      }
    },
    [entryId, onUploaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) void uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
      e.target.value = "";
    },
    [uploadFile],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">
        {PANE2_SCHEDULE.thumbnailImage}
      </span>
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-md border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={PANE2_SCHEDULE.thumbnailImageAlt}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="size-7 bg-background/90"
              aria-label={PANE2_SCHEDULE.thumbnailReplace}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="size-7 bg-background/90"
              aria-label={PANE2_SCHEDULE.thumbnailClear}
              disabled={uploading}
              onClick={onClear}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-5 text-center transition-colors",
            dragOver && "border-ring bg-accent/20",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">
            {uploading
              ? PANE2_SCHEDULE.thumbnailUploading
              : PANE2_SCHEDULE.thumbnailDropHint}
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
      />
      {error ? (
        <p className="text-[10px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
