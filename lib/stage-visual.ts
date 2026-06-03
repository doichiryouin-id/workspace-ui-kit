import { type StageKey } from "@/lib/schema";
import { parseDropContainer } from "@/lib/drop-container";
import { cn } from "@/lib/utils";

/** Pane 2 列見出し用 Badge variant（`components/ui/badge.tsx` と対応）。 */
export const STAGE_BADGE_VARIANT = {
  idea: "stage-idea",
  inProduction: "stage-in-production",
  published: "stage-published",
} as const satisfies Record<StageKey, string>;

export function stageKeyFromContainer(containerId: string): StageKey {
  return parseDropContainer(containerId).stage;
}

const STAGE_BORDER: Record<StageKey, string> = {
  idea: "border-stage-idea-border",
  inProduction: "border-stage-in-production-border",
  published: "border-stage-published-border",
};

const STAGE_MUTED_BG: Record<StageKey, string> = {
  idea: "bg-stage-idea-muted",
  inProduction: "bg-stage-in-production-muted",
  published: "bg-stage-published-muted",
};

const STAGE_LABEL: Record<StageKey, string> = {
  idea: "text-stage-idea-foreground",
  inProduction: "text-stage-in-production-foreground",
  published: "text-stage-published-foreground",
};

/** グループ見出し（左 3px バー + 薄い背景）。 */
export function stageSectionHeaderClassName(
  stage: StageKey,
  variant: "section" | "sub",
): string {
  return cn(
    "sticky z-10 -mx-3 mb-2 flex items-center justify-between gap-2 border-l-[3px] py-1.5",
    STAGE_BORDER[stage],
    STAGE_MUTED_BG[stage],
    variant === "sub" ? "top-8 px-7 pl-4" : "top-0 px-5 pl-4",
  );
}

export function stageSectionLabelClassName(stage: StageKey): string {
  return cn("truncate text-xs font-medium", STAGE_LABEL[stage]);
}

const STAGE_DROPZONE_OVER: Record<StageKey, string> = {
  idea: "border-stage-idea-border/70 bg-stage-idea-muted/80",
  inProduction:
    "border-stage-in-production-border/70 bg-stage-in-production-muted/80",
  published: "border-stage-published-border/70 bg-stage-published-muted/80",
};

/** ドロップゾーン hover 時の列色ヒント。 */
export function stageDropzoneOverClassName(stage: StageKey): string {
  return STAGE_DROPZONE_OVER[stage];
}
