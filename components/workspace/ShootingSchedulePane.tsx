"use client";

/**
 * Pane 2「撮影スケジュール」: 6〜12月・月4本 + フリー枠。
 */

import { Link2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  groupShootingScheduleByMonth,
  isShootingEntryFilled,
  slotLabel,
} from "@/lib/computed/shooting-schedule";
import { PANE2_SCHEDULE } from "@/lib/labels";
import { type ShootingScheduleEntry } from "@/lib/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  const monthGroups = groupShootingScheduleByMonth(entries);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-6 px-3 py-4">
        {monthGroups.map((group) => (
          <section key={group.month} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {group.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                {PANE2_SCHEDULE.filledSummary(
                  group.filledCount,
                  group.slots.length + (group.freeEntry ? 1 : 0),
                )}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {group.slots.map((entry) => (
                <ScheduleSlotCard
                  key={entry.id}
                  entry={entry}
                  label={slotLabel(entry.slotIndex ?? 1)}
                  selected={selectedEntryId === entry.id}
                  onSelect={() => onSelectEntry(entry.id)}
                  onUpdate={(patch) => onUpdateEntry(entry.id, patch)}
                />
              ))}
            </ul>
            {group.freeEntry ? (
              <FreeSlotCard
                entry={group.freeEntry}
                selected={selectedEntryId === group.freeEntry.id}
                onSelect={() => onSelectEntry(group.freeEntry!.id)}
                onUpdate={(patch) =>
                  onUpdateEntry(group.freeEntry!.id, patch)
                }
              />
            ) : null}
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}

function ScheduleSlotCard({
  entry,
  label,
  selected,
  onSelect,
  onUpdate,
}: {
  entry: ShootingScheduleEntry;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: ShootingSchedulePatch) => void;
}) {
  const filled = isShootingEntryFilled(entry);

  return (
    <li>
      <article
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors",
          selected && "border-ring bg-accent/15",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex w-full items-start justify-between gap-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {filled
              ? entry.videoTitle.trim() || entry.videoContent.trim()
              : PANE2_SCHEDULE.emptyTitle}
          </span>
        </button>
        <Separator />
        <div className="flex flex-col gap-2.5">
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
