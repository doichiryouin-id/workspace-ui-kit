"use client";

/**
 * Pane 2「撮影スケジュール」: 枠カード + フリー枠（月・本数ラベルなし）。
 */

import { useEffect } from "react";
import { Link2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { flattenShootingScheduleForPane2 } from "@/lib/computed/shooting-schedule";
import { PANE2_SCHEDULE } from "@/lib/labels";
import { type ShootingScheduleEntry } from "@/lib/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InlineDateField,
  InlineFieldRow,
  InlineTextField,
  InlineTextareaField,
} from "@/components/primitives";
import { ThumbnailDropZone } from "@/components/workspace/ThumbnailDropZone";

export type ShootingSchedulePatch = Partial<
  Pick<
    ShootingScheduleEntry,
    | "shootDate"
    | "videoContent"
    | "videoTitle"
    | "thumbnailTitle"
    | "thumbnailImageUrl"
    | "publishDate"
    | "url"
    | "freeNote"
  >
>;

type ShootingSchedulePaneProps = {
  entries: ShootingScheduleEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onUpdateEntry: (id: string, patch: ShootingSchedulePatch) => void;
};

export function ShootingSchedulePane({
  entries,
  selectedEntryId,
  onSelectEntry,
  onUpdateEntry,
}: ShootingSchedulePaneProps) {
  const paneEntries = flattenShootingScheduleForPane2(entries);

  // Pane 1 / 4 から選んだ枠へスクロールして、撮影スケジュール上でも同じ動画を見えるようにする
  useEffect(() => {
    if (!selectedEntryId) return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(shootingScheduleDomId(selectedEntryId))
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedEntryId]);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <ul className="flex flex-col gap-3 px-3 py-4">
        {paneEntries.map((entry) =>
          entry.kind === "free" ? (
            <li key={entry.id} id={shootingScheduleDomId(entry.id)}>
              <FreeSlotCard
                entry={entry}
                selected={selectedEntryId === entry.id}
                onSelect={() => onSelectEntry(entry.id)}
                onUpdate={(patch) => onUpdateEntry(entry.id, patch)}
              />
            </li>
          ) : (
            <ScheduleSlotCard
              key={entry.id}
              entry={entry}
              selected={selectedEntryId === entry.id}
              onSelect={() => onSelectEntry(entry.id)}
              onUpdate={(patch) => onUpdateEntry(entry.id, patch)}
            />
          ),
        )}
      </ul>
    </ScrollArea>
  );
}

function shootingScheduleDomId(entryId: string): string {
  return `shooting-schedule-${entryId}`;
}

function ScheduleSlotCard({
  entry,
  selected,
  onSelect,
  onUpdate,
}: {
  entry: ShootingScheduleEntry;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: ShootingSchedulePatch) => void;
}) {
  return (
    <li id={shootingScheduleDomId(entry.id)}>
      <article
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col gap-2.5 rounded-lg border border-border bg-card p-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected && "border-ring bg-accent/15",
        )}
      >
        <div
          className="flex flex-col gap-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <InlineFieldRow label={PANE2_SCHEDULE.shootDate}>
            <InlineDateField
              value={entry.shootDate}
              onSave={(v) => onUpdate({ shootDate: v })}
              ariaLabel={PANE2_SCHEDULE.shootDate}
            />
          </InlineFieldRow>
          <InlineFieldRow label={PANE2_SCHEDULE.videoContent}>
            <InlineTextareaField
              value={entry.videoContent}
              onSave={(v) => onUpdate({ videoContent: v })}
              ariaLabel={PANE2_SCHEDULE.videoContent}
              placeholder={PANE2_SCHEDULE.videoContentPlaceholder}
            />
          </InlineFieldRow>
          <InlineFieldRow label={PANE2_SCHEDULE.videoTitle}>
            <InlineTextField
              value={entry.videoTitle}
              onSave={(v) => onUpdate({ videoTitle: v })}
              ariaLabel={PANE2_SCHEDULE.videoTitle}
              placeholder={PANE2_SCHEDULE.videoTitlePlaceholder}
            />
          </InlineFieldRow>
          <InlineFieldRow label={PANE2_SCHEDULE.thumbnailTitle}>
            <InlineTextField
              value={entry.thumbnailTitle}
              onSave={(v) => onUpdate({ thumbnailTitle: v })}
              ariaLabel={PANE2_SCHEDULE.thumbnailTitle}
              placeholder={PANE2_SCHEDULE.thumbnailTitlePlaceholder}
            />
          </InlineFieldRow>
          <ThumbnailDropZone
            entryId={entry.id}
            imageUrl={entry.thumbnailImageUrl}
            onUploaded={(url) => onUpdate({ thumbnailImageUrl: url })}
            onClear={() => onUpdate({ thumbnailImageUrl: "" })}
          />
          <InlineFieldRow label={PANE2_SCHEDULE.publishDate}>
            <InlineDateField
              value={entry.publishDate}
              onSave={(v) => onUpdate({ publishDate: v })}
              ariaLabel={PANE2_SCHEDULE.publishDate}
            />
          </InlineFieldRow>
          <InlineFieldRow label={PANE2_SCHEDULE.url}>
            <DropUrlField
              value={entry.url}
              onSave={(v) => onUpdate({ url: v })}
              ariaLabel={PANE2_SCHEDULE.url}
            />
          </InlineFieldRow>
        </div>
      </article>
    </li>
  );
}

function FreeSlotCard({
  entry,
  selected,
  onSelect,
  onUpdate,
}: {
  entry: ShootingScheduleEntry;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: ShootingSchedulePatch) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3",
        selected && "border-ring bg-accent/10",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {PANE2_SCHEDULE.freeSlot}
      </button>
      <DropUrlField
        value={entry.url}
        onSave={(v) => onUpdate({ url: v })}
        ariaLabel={PANE2_SCHEDULE.url}
      />
      <InlineTextareaField
        value={entry.freeNote}
        onSave={(v) => onUpdate({ freeNote: v })}
        ariaLabel={PANE2_SCHEDULE.freeSlot}
        placeholder={PANE2_SCHEDULE.freeNotePlaceholder}
      />
    </div>
  );
}

function DropUrlField({
  value,
  onSave,
  ariaLabel,
}: {
  value: string;
  onSave: (v: string) => void;
  ariaLabel: string;
}) {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const uri =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("URL") ||
      e.dataTransfer.getData("text/plain");
    const trimmed = uri.trim();
    if (trimmed) onSave(trimmed.split("\n")[0]?.trim() ?? trimmed);
  };

  return (
    <div
      className="flex flex-col gap-1"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <InlineTextField
        value={value}
        onSave={onSave}
        ariaLabel={ariaLabel}
        placeholder={PANE2_SCHEDULE.urlPlaceholder}
      />
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Link2 className="size-3" aria-hidden="true" />
        {PANE2_SCHEDULE.urlDropHint}
      </span>
    </div>
  );
}
