"use client";

import { useCallback, useEffect, useState } from "react";

export type PaneWidthKey = "pane1" | "pane2" | "pane3" | "pane4";

export const PANE4_COLLAPSED_WIDTH = 48;

export const DEFAULT_PANE_WIDTHS: Record<PaneWidthKey, number> = {
  pane1: 256,
  pane2: 440,
  pane3: 520,
  pane4: 520,
};

export const MIN_PANE_WIDTHS: Record<PaneWidthKey, number> = {
  pane1: 200,
  pane2: 260,
  pane3: 280,
  pane4: 240,
};

export const MAX_PANE_WIDTHS: Record<PaneWidthKey, number> = {
  pane1: 420,
  pane2: 720,
  pane3: 960,
  pane4: 960,
};

const STORAGE_KEY = "workspace-ui-kit:pane-widths";

function clampPaneWidth(key: PaneWidthKey, value: number): number {
  return Math.min(MAX_PANE_WIDTHS[key], Math.max(MIN_PANE_WIDTHS[key], value));
}

function loadPaneWidths(): Record<PaneWidthKey, number> {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PANE_WIDTHS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PANE_WIDTHS };
    const parsed = JSON.parse(raw) as Partial<Record<PaneWidthKey, number>>;
    return {
      pane1: clampPaneWidth("pane1", parsed.pane1 ?? DEFAULT_PANE_WIDTHS.pane1),
      pane2: clampPaneWidth("pane2", parsed.pane2 ?? DEFAULT_PANE_WIDTHS.pane2),
      pane3: clampPaneWidth("pane3", parsed.pane3 ?? DEFAULT_PANE_WIDTHS.pane3),
      pane4: clampPaneWidth("pane4", parsed.pane4 ?? DEFAULT_PANE_WIDTHS.pane4),
    };
  } catch {
    return { ...DEFAULT_PANE_WIDTHS };
  }
}

export function useWorkspacePaneWidths() {
  const [widths, setWidths] = useState<Record<PaneWidthKey, number>>(
    DEFAULT_PANE_WIDTHS,
  );

  useEffect(() => {
    setWidths(loadPaneWidths());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      // ignore quota errors
    }
  }, [widths]);

  const setPaneWidth = useCallback((key: PaneWidthKey, next: number) => {
    setWidths((prev) => ({
      ...prev,
      [key]: clampPaneWidth(key, next),
    }));
  }, []);

  /** 隣接パネル間: 左を広げると右を狭める。 */
  const resizeAdjacent = useCallback(
    (left: PaneWidthKey, right: PaneWidthKey, delta: number) => {
      if (delta === 0) return;
      setWidths((prev) => {
        const proposedLeft = prev[left] + delta;
        const proposedRight = prev[right] - delta;
        const nextLeft = clampPaneWidth(left, proposedLeft);
        const nextRight = clampPaneWidth(right, proposedRight);
        const appliedDelta = nextLeft - prev[left];
        const pairedRight = clampPaneWidth(right, prev[right] - appliedDelta);
        return { ...prev, [left]: nextLeft, [right]: pairedRight };
      });
    },
    [],
  );

  return { widths, setPaneWidth, resizeAdjacent };
}
