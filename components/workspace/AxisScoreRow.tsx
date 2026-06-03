"use client";

import { Star, StarHalf, X } from "lucide-react";

import { cn } from "@/lib/utils";

/** Pane 4 評価 UI 用の ★ スコア行。 */
export function AxisScoreRow({
  label,
  value,
  bold = false,
  editable = false,
  onChange,
  onReset,
}: {
  label: string;
  value: number | null;
  bold?: boolean;
  editable?: boolean;
  onChange?: (value: number) => void;
  onReset?: () => void;
}) {
  if (value === null && !editable) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <span
          className={cn(
            "text-muted-foreground",
            bold && "font-medium text-foreground",
          )}
        >
          {label}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="tabular-nums">—</span>
          <span className="text-[11px]">未評価</span>
        </span>
      </div>
    );
  }
  const v = value ?? 0;
  const floor = Math.floor(v);
  const hasHalf = !editable && v - floor >= 0.5;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span
        className={cn(
          "text-muted-foreground",
          bold && "font-medium text-foreground",
        )}
      >
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const isFull = n <= floor;
            const isHalf = hasHalf && n === floor + 1;
            const StarComp = isHalf ? StarHalf : Star;
            const filled = isFull || isHalf;
            const starEl = (
              <StarComp
                className={cn(
                  "size-3",
                  filled
                    ? "fill-primary text-primary"
                    : "fill-muted-foreground/20 text-muted-foreground/30",
                )}
                aria-hidden="true"
              />
            );
            if (editable && onChange) {
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className="rounded-sm transition-opacity outline-none hover:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`${label} を ${n} に設定`}
                >
                  {starEl}
                </button>
              );
            }
            return <span key={n}>{starEl}</span>;
          })}
        </span>
        <span
          className={cn(
            "min-w-[2.25rem] text-right text-foreground tabular-nums",
            bold && "font-medium",
            value === null && "text-muted-foreground",
          )}
        >
          {value !== null ? value.toFixed(1) : "—"}
        </span>
        {editable && onReset && value !== null && (
          <button
            type="button"
            onClick={onReset}
            className="ml-1 inline-flex size-5 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`${label} の評価をリセット`}
          >
            <X className="size-3" />
          </button>
        )}
      </span>
    </div>
  );
}
