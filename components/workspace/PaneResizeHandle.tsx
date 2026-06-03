"use client";

import { useCallback, useRef } from "react";

import { cn } from "@/lib/utils";

type PaneResizeHandleProps = {
  onResize: (deltaX: number) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
};

/** パネル間のドラッグリサイズハンドル。 */
export function PaneResizeHandle({
  onResize,
  disabled = false,
  className,
  style,
  label = "パネル幅を調整",
}: PaneResizeHandleProps) {
  const lastX = useRef(0);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      const el = event.currentTarget;
      lastX.current = event.clientX;
      el.setPointerCapture(event.pointerId);

      const handleMove = (ev: PointerEvent) => {
        const delta = ev.clientX - lastX.current;
        if (delta === 0) return;
        lastX.current = ev.clientX;
        onResize(delta);
      };

      const handleUp = (ev: PointerEvent) => {
        el.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [disabled, onResize],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      style={style}
      className={cn(
        "group relative z-20 w-1.5 shrink-0 touch-none select-none",
        disabled ? "cursor-default opacity-40" : "cursor-col-resize",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors",
          !disabled && "group-hover:bg-primary/50 group-active:bg-primary",
        )}
      />
    </div>
  );
}
