"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { type VideoPlanProfile } from "@/lib/schema";
import {
  mergeUrlMetadataIntoProfile,
  type UrlMetadata,
  urlMetadataSchema,
} from "@/lib/url-metadata";
import { PANE3_SECTION } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { InlineFieldRow } from "@/components/primitives";

type ReferenceUrlFieldProps = {
  profile: VideoPlanProfile;
  setVideoPlanProfile: React.Dispatch<React.SetStateAction<VideoPlanProfile>>;
};

async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const res = await fetch("/api/url-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data: unknown = await res.json();
  if (!res.ok) {
    const err =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "メタデータの取得に失敗しました";
    throw new Error(err);
  }
  return urlMetadataSchema.parse(data);
}

export function ReferenceUrlField({
  profile,
  setVideoPlanProfile,
}: ReferenceUrlFieldProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState("");

  const handleSaveUrl = async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === profile.referenceUrl.trim()) return;

    setVideoPlanProfile((p) => ({ ...p, referenceUrl: trimmed }));

    if (!trimmed) {
      setStatus("idle");
      setStatusMessage("");
      return;
    }

    setStatus("loading");
    setStatusMessage(PANE3_SECTION.referenceUrlFetching);

    try {
      const meta = await fetchUrlMetadata(trimmed);
      setVideoPlanProfile((p) => ({
        ...p,
        ...mergeUrlMetadataIntoProfile(
          {
            name: p.name,
            referenceUrl: p.referenceUrl,
            outline: p.outline,
            descriptionNotes: p.descriptionNotes,
          },
          meta,
        ),
      }));
      setStatus("success");
      setStatusMessage(PANE3_SECTION.referenceUrlSuccess(meta.title));
    } catch (err) {
      setStatus("error");
      setStatusMessage(
        PANE3_SECTION.referenceUrlError(
          err instanceof Error ? err.message : "取得に失敗しました",
        ),
      );
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <InlineFieldRow label={PANE3_SECTION.referenceUrl}>
        <div className="relative flex min-w-0 flex-1 items-center">
          <Input
            type="url"
            defaultValue={profile.referenceUrl}
            placeholder="https://..."
            aria-label={PANE3_SECTION.referenceUrl}
            onBlur={(e) => {
              void handleSaveUrl(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Escape") {
                (e.target as HTMLInputElement).value = profile.referenceUrl;
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-8 bg-card pr-8"
          />
          {status === "loading" ? (
            <Loader2
              aria-hidden="true"
              className="pointer-events-none absolute right-2 size-4 animate-spin text-muted-foreground"
            />
          ) : null}
        </div>
      </InlineFieldRow>
      <p className="text-xs text-muted-foreground">{PANE3_SECTION.referenceUrlHint}</p>
      {statusMessage ? (
        <p
          className={cn(
            "text-xs",
            status === "error" ? "text-destructive" : "text-muted-foreground",
          )}
          role={status === "error" ? "alert" : "status"}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
