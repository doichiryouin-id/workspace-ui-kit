"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { type VideoPlanRow } from "@/lib/schema";
import { isProductionContainer, parseDropContainer } from "@/lib/drop-container";
import { PANE2_ROW } from "@/lib/labels";
import { VideoPlanAvatar } from "@/components/workspace/VideoPlanAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Pane 2 のステージグループ用、ドラッグ可能な動画企画行。
 */
export function SortableVideoPlanRow({
  cand,
  containerId,
  selected,
  onSelect,
  onProductionProgressNoteSave,
  actions,
}: {
  cand: VideoPlanRow;
  containerId: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onProductionProgressNoteSave?: (id: string, note: string) => void;
  actions: ReactNode;
}) {
  const showProgressNote = isProductionContainer(containerId);
  const stage = parseDropContainer(containerId).stage;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: cand.id,
    data: { containerId, name: cand.name },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/candidate relative",
        isDragging && "pointer-events-none opacity-50",
      )}
    >
      <div
        className={cn(
          "rounded-md transition-colors",
          selected ? "bg-accent text-accent-foreground" : "text-foreground",
        )}
      >
        <div className="flex items-start gap-0.5 pr-8">
          <span
            {...attributes}
            {...listeners}
            aria-label={`${cand.name} の並び替え`}
            className={cn(
              "mt-2.5 flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground",
              "opacity-0 transition-opacity group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
              "hover:text-foreground active:cursor-grabbing",
              "outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
              selected && "text-accent-foreground/80",
            )}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
            <button
              type="button"
              onClick={() => onSelect(cand.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors",
                "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                !selected && "hover:bg-muted",
              )}
            >
              <VideoPlanAvatar
                name={cand.name}
                selected={selected}
                size="row"
                stage={stage}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {cand.publishDateLabel ? (
                    <span
                      className={cn(
                        "mr-1.5 tabular-nums font-medium",
                        selected
                          ? "text-accent-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {cand.publishDateLabel}
                    </span>
                  ) : null}
                  {cand.name}
                </p>
              </div>
              <span className="shrink-0 transition-opacity group-focus-within/candidate:opacity-0 group-hover/candidate:opacity-0">
                <ScoreBadge avg={cand.averageScore} selected={selected} />
              </span>
            </button>
            {showProgressNote && onProductionProgressNoteSave ? (
              <ProductionProgressInput
                videoPlanId={cand.id}
                value={cand.productionProgressNote}
                selected={selected}
                onSave={onProductionProgressNoteSave}
              />
            ) : null}
          </div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-2 right-1",
                "opacity-0 group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
                "transition-opacity",
                "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`${cand.name} の操作`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>{actions}</DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function ProductionProgressInput({
  videoPlanId,
  value,
  selected,
  onSave,
}: {
  videoPlanId: string;
  value: string;
  selected: boolean;
  onSave: (id: string, note: string) => void;
}) {
  return (
    <div
      className="px-1.5 pb-1.5 pl-10"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        key={`${videoPlanId}-${value}`}
        type="text"
        defaultValue={value}
        placeholder={PANE2_ROW.productionProgressPlaceholder}
        aria-label="制作進捗メモ"
        onBlur={(e) => {
          if (e.target.value !== value) {
            onSave(videoPlanId, e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            (e.target as HTMLInputElement).value = value;
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={cn(
          "h-7 border-input bg-card text-xs",
          selected && "border-accent-foreground/20",
        )}
      />
    </div>
  );
}

function ScoreBadge({
  avg,
  selected,
}: {
  avg: number | null;
  selected: boolean;
}) {
  if (avg === null) {
    return (
      <span
        className={cn(
          "shrink-0 text-xs",
          selected ? "text-accent-foreground/80" : "text-muted-foreground",
        )}
        aria-label="未評価"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
        selected ? "text-accent-foreground" : "text-foreground/80",
      )}
      aria-label={`平均スコア ${avg.toFixed(1)} / 5`}
    >
      <Star aria-hidden className="size-3 fill-current" />
      {avg.toFixed(1)}
    </span>
  );
}
