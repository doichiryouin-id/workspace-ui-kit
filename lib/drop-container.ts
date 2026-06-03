import { STAGE_LABELS, VIDEO_SERIES } from "@/lib/labels";
import { type StageKey } from "@/lib/schema";

/** 制作中を本編 / ショートに分けるときのドロップ先 ID。 */
export type ProductionFormat = "long" | "short";

export type DropContainerId = StageKey | `inProduction:${ProductionFormat}`;

export function productionDropId(format: ProductionFormat): DropContainerId {
  return `inProduction:${format}`;
}

/** Pane 2 の制作中サブグループ（本編 / ショート）か。 */
export function isProductionContainer(containerId: string): boolean {
  return containerId.startsWith("inProduction:");
}

export function parseDropContainer(id: string): {
  stage: StageKey;
  series?: string;
} {
  if (id === "inProduction:long") {
    return { stage: "inProduction", series: VIDEO_SERIES.long };
  }
  if (id === "inProduction:short") {
    return { stage: "inProduction", series: VIDEO_SERIES.short };
  }
  return { stage: id as StageKey };
}

export function formatDropContainerLabel(id: string): string {
  const parsed = parseDropContainer(id);
  if (parsed.series) {
    return `${STAGE_LABELS.inProduction}（${parsed.series}）`;
  }
  return STAGE_LABELS[parsed.stage];
}

/** ショート以外（本編・ネタ箱・未設定）は長尺側にまとめる。 */
export function isShortSeries(source: string): boolean {
  return source.trim() === VIDEO_SERIES.short;
}

export function matchesDropContainer(
  stage: StageKey,
  source: string,
  containerId: string,
): boolean {
  const target = parseDropContainer(containerId);
  if (stage !== target.stage) return false;
  if (target.stage === "inProduction" && target.series) {
    return target.series === VIDEO_SERIES.short
      ? isShortSeries(source)
      : !isShortSeries(source);
  }
  return true;
}
