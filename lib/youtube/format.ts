/** ISO 8601 duration (PT4M5S) → m:ss */
export function formatIso8601Duration(iso: string): string {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return iso;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 秒数 → m:ss（Analytics API の averageViewDuration 用） */
export function formatSecondsDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "";
  const rounded = Math.round(totalSeconds);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 0〜1 の比率 → パーセント文字列（小数1桁） */
export function formatRatioAsPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "";
  return (ratio * 100).toFixed(1);
}
