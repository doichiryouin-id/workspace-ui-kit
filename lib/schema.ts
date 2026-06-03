/**
 * 動画企画管理ドメインの Zod スキーマと派生型（治療院 YouTube チャンネル向け）。
 * 雛形の SSoT として、UI コンポーネントはここから型をインポートする。
 *
 * 仕様の出典:
 *   - openspec/decision/0005-dashboard-drilldown-and-global-header.md
 *   - openspec/changes/add-4pane-workspace-template/specs/workspace-template/spec.md
 */

import { z } from "zod";

// ===== Pane 1: チャンネル分類 → シリーズ 階層 =====

/** チャンネル分類配下のシリーズ。Pane 1 の階層 Sidebar に表示する単位。 */
export const seriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
});
export type Series = z.infer<typeof seriesSchema>;

/** チャンネル分類と配下のシリーズ一覧。Pane 1 の階層 Sidebar の最上位単位。 */
export const channelSchema = z.object({
  id: z.string(),
  name: z.string(),
  series: z.array(seriesSchema),
});
export type Channel = z.infer<typeof channelSchema>;

// ===== 動画企画プロフィール（Pane 3） =====

/** 動画企画の Pane 3 編集フィールド。 */
export const videoPlanProfileSchema = z.object({
  name: z.string(),
  /** ネタの元記事・論文・動画などの URL。貼り付けでメタデータ取得。 */
  referenceUrl: z.string(),
  source: z.string(),
  assignee: z.string(),
  priority: z.string(),
  availableStartDate: z.string(),
  /** 制作中のみ Pane 2 行に表示する進捗メモ（1 行）。 */
  productionProgressNote: z.string(),
  outline: z.string(),
  descriptionNotes: z.string(),
});
export type VideoPlanProfile = z.infer<typeof videoPlanProfileSchema>;

// ===== 制作チェック（4 軸。Pane 3 / 4 の評価 UI） =====

/** 評価観点キー。Subtask.axisScores のキーと一致する。 */
export const axisKeySchema = z.enum([
  "achievements",
  "thinkingAbility",
  "communication",
  "cultureFit",
]);
export type AxisKey = z.infer<typeof axisKeySchema>;

/** 4 観点別スコア。未評価は null。平均スコアは null 除外で派生計算する。 */
export const axisScoresSchema = z.object({
  achievements: z.number().nullable(),
  thinkingAbility: z.number().nullable(),
  communication: z.number().nullable(),
  cultureFit: z.number().nullable(),
});
export type AxisScores = z.infer<typeof axisScoresSchema>;

/** 評価観点の表示順。Pane 3 / Pane 4 で共通に使う。 */
export const AXIS_ORDER = axisKeySchema.options;

// ===== 動画の状態（Pane 2 列）・サブタスク（Pane 3/4） =====

/** 動画企画の状態キー。`STAGE_ORDER` と一致する 3 段階。 */
export const stageKeySchema = z.enum(["idea", "inProduction", "published"]);
export type StageKey = z.infer<typeof stageKeySchema>;

/** サブタスクの実施ステータス。done = 完了 / planned = 予定済 / pending = 未着手。 */
export const stageStatusSchema = z.enum(["done", "planned", "pending"]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

const txtAttachmentSchema = z.object({
  id: z.string(),
  kind: z.literal("txt"),
  name: z.string(),
  size: z.string(),
  previewText: z.string(),
});
const pdfAttachmentSchema = z.object({
  id: z.string(),
  kind: z.literal("pdf"),
  name: z.string(),
  size: z.string(),
});
export const attachmentSchema = z.discriminatedUnion("kind", [
  txtAttachmentSchema,
  pdfAttachmentSchema,
]);
export type Attachment = z.infer<typeof attachmentSchema>;

/** サブタスク（台本・サムネ・概要欄等）。件数は動画ごとに自由。 */
export const subtaskSchema = z.object({
  id: z.string(),
  label: z.string(),
  date: z.string(),
  format: z.string(),
  assignee: z.string(),
  decision: z.string().optional(),
  comment: z.string().optional(),
  summary: z.string().optional(),
  axisScores: axisScoresSchema,
  attachments: z.array(attachmentSchema),
});
export type Subtask = z.infer<typeof subtaskSchema>;

/**
 * Pane 2 で表示する状態の並び順（ネタ → 制作中 → 公開済み）。
 */
export const STAGE_ORDER = stageKeySchema.options;

/** 動画企画の最上位データ。Pane 2 の所属は `stage`（状態）で決まる。 */
export const videoPlanSchema = z.object({
  id: z.string(),
  profile: videoPlanProfileSchema,
  subtasks: z.array(subtaskSchema),
  stage: stageKeySchema,
  archived: z.boolean().default(false),
});
export type VideoPlan = z.infer<typeof videoPlanSchema>;

// ===== JSON 全体用スキーマ =====

export const channelsSchema = z.array(channelSchema);
export const videoPlansSchema = z.array(videoPlanSchema);
export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
});

// ===== Pane 2: 撮影スケジュール（6〜12月） =====

export const shootingScheduleSlotKindSchema = z.enum(["slot", "free"]);

// ===== Pane 3: 公開後アナリティクス（YouTube Studio 相当・手入力） =====

/** 公開後の成績。Studio から手入力（将来 API 連携可）。 */
export const videoAnalyticsSchema = z.object({
  views: z.string().default(""),
  impressions: z.string().default(""),
  /** クリック率（%）。 */
  ctrPercent: z.string().default(""),
  /** 平均視聴率・視聴維持率（%）。 */
  averageViewRatePercent: z.string().default(""),
  /** 平均視聴時間（例: 4:32）。 */
  averageViewDuration: z.string().default(""),
  likes: z.string().default(""),
  comments: z.string().default(""),
  subscribersGained: z.string().default(""),
  memo: z.string().default(""),
  /** ISO 8601。API 自動取得の最終実行時刻。 */
  fetchedAt: z.string().default(""),
});
export type VideoAnalytics = z.infer<typeof videoAnalyticsSchema>;

export const EMPTY_VIDEO_ANALYTICS: VideoAnalytics =
  videoAnalyticsSchema.parse({});

// ===== マイルストーン分析（公開後 24h / 3d / 7d / 30d） =====

export const milestoneWindowSchema = z.enum(["24h", "3d", "7d", "30d"]);
export type MilestoneWindow = z.infer<typeof milestoneWindowSchema>;

export const milestoneMetricsSchema = z.object({
  views: z.string().default(""),
  impressions: z.string().default(""),
  ctrPercent: z.string().default(""),
  /** ISO 8601。集計実行時刻。 */
  computedAt: z.string().default(""),
});
export type MilestoneMetrics = z.infer<typeof milestoneMetricsSchema>;

export const EMPTY_MILESTONE_METRICS: MilestoneMetrics =
  milestoneMetricsSchema.parse({});

export const milestoneMapSchema = z
  .object({
    "24h": milestoneMetricsSchema.optional(),
    "3d": milestoneMetricsSchema.optional(),
    "7d": milestoneMetricsSchema.optional(),
    "30d": milestoneMetricsSchema.optional(),
  })
  .default({});
export type MilestoneMap = z.infer<typeof milestoneMapSchema>;

export type CompareWindow = MilestoneWindow | "lifetime";

/** 1 枠分の撮影予定。月4本 + フリー枠。 */
export const shootingScheduleEntrySchema = z.object({
  id: z.string(),
  /** 表示グループ用（6〜12）。 */
  month: z.number().int().min(1).max(12),
  kind: shootingScheduleSlotKindSchema.default("slot"),
  /** 1〜8（kind=slot のとき。6月など同一撮影月に2回分ある場合は8まで）。 */
  slotIndex: z.number().int().min(1).max(8).optional(),
  shootDate: z.string().default(""),
  /** 動画の内容（概要・ネタ）。 */
  videoContent: z.string().default(""),
  videoTitle: z.string().default(""),
  thumbnailTitle: z.string().default(""),
  /** 使用サムネイル（/api/thumbnails/...）。 */
  thumbnailImageUrl: z.string().default(""),
  publishDate: z.string().default(""),
  url: z.string().default(""),
  /** kind=free の自由記入。 */
  freeNote: z.string().default(""),
  videoPlanId: z.string().optional(),
  /** Pane 3: 公開後の YouTube 分析数値。 */
  analytics: videoAnalyticsSchema.default(EMPTY_VIDEO_ANALYTICS),
  /** 公開後マイルストーン（24h / 3d / 7d / 30d）の IMP・CTR・視聴。 */
  milestones: milestoneMapSchema.default({}),
});
export type ShootingScheduleEntry = z.infer<typeof shootingScheduleEntrySchema>;

export const shootingScheduleSchema = z.array(shootingScheduleEntrySchema);

// ===== Pane 4 の表示状態（SelectedDetail） =====

/**
 * Pane 4 に「何を開いているか」を表す型。
 *
 * - `{ type: "subtask"; id }`: サブタスク詳細を表示中
 * - `null`: 未選択（Pane 4 は畳み状態）
 */
export type SelectedDetail = { type: "subtask"; id: string } | null;

// ===== Pane 2 の派生計算用 UI 表示型 =====

export type VideoPlanRow = {
  id: string;
  name: string;
  averageScore: number | null;
  /** 公開予定日の表示用（例: 6/3）。未設定なら null。 */
  publishDateLabel: string | null;
  /** 制作中列での進捗メモ（Pane 2 のみ表示）。 */
  productionProgressNote: string;
};

/** 制作中を長尺 / ショートに分けたときのサブグループ。 */
export type ProductionSubgroup = {
  dropContainerId: string;
  label: string;
  items: VideoPlanRow[];
};

export type Group =
  | { kind: "stage"; stage: StageKey; label: string; items: VideoPlanRow[] }
  | {
      kind: "productionSplit";
      stage: "inProduction";
      label: string;
      subgroups: ProductionSubgroup[];
    }
  | { kind: "archived"; label: string; items: VideoPlanRow[] };
