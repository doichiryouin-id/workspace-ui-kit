/**
 * 表示文言（labels）。
 *
 * 治療院 YouTube チャンネル向け動画企画管理のラベル。
 */

import { type AxisKey, type StageKey } from "@/lib/schema";

// ===== 動画の制作チェック（4 軸。Pane 3 / 4 の評価 UI を流用） =====

export const EVALUATION_AXIS: Record<AxisKey, string> = {
  achievements: "内容の正確さ",
  thinkingAbility: "わかりやすさ",
  communication: "視聴維持",
  cultureFit: "安全・配慮",
} as const;

/** Pane 2 の列見出し（動画の状態）。 */
export const STAGE_LABELS: Record<StageKey, string> = {
  idea: "ネタ",
  inProduction: "制作中",
  published: "公開済み",
};

/** Pane 2 末尾の折りたたみグループ（archived === true の動画企画）。 */
export const ARCHIVED_GROUP_LABEL = "公開済み（履歴）";

/** Pane 1 / 2 で使うシリーズ（長尺・短尺・ネタ箱）。 */
export const VIDEO_SERIES = {
  long: "本編",
  short: "ショート",
  idea: "ネタ箱",
} as const;

/** 制作中ステータス内のサブ区分（長尺 / ショート）。 */
export const PRODUCTION_FORMAT_LABELS = {
  long: VIDEO_SERIES.long,
  short: VIDEO_SERIES.short,
} as const;

// ===== Pane 3: 公開後アナリティクス =====

export const PANE3_ANALYTICS = {
  headerTitle: "公開後の成績",
  noSelection: "Pane 2 で枠を選択すると、ここに分析数値を入力できます。",
  freeSlotHint: "フリー枠は分析対象外です。第1〜4本の枠を選んでください。",
  untitled: "（タイトル未入力）",
  notPublishedYet: "公開日未設定 — 公開後に Studio から数値を入力",
  publishedOn: (date: string) => `公開 ${date}`,
  inputSection: "分析数値（手入力）",
  inputHint: "URL を入れると自動取得します。不足分は手入力も可能です",
  fetchFromYouTube: "YouTube から再取得",
  fetching: "取得中…",
  fetchError: "取得に失敗しました",
  lastFetched: (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `最終取得: ${d.toLocaleString("ja-JP")}`;
  },
  autoFetchHint: "動画 URL を Pane 2 に入れると自動で数値を取得します",
  views: "視聴回数",
  impressions: "インプレッション",
  ctr: "クリック率（CTR）",
  averageViewRate: "平均視聴率（視聴維持）",
  averageViewDuration: "平均視聴時間",
  likes: "高評価",
  comments: "コメント",
  subscribersGained: "チャンネル登録者増",
  memo: "メモ",
  memoPlaceholder: "取得日・所感（例: Studio 5/28 時点）",
} as const;

// ===== Pane 3 ダッシュボードのセクション見出し（Pane 4 等で参照） =====

export const PANE3_SECTION = {
  applicationInfo: "企画情報",
  referenceUrl: "参考 URL",
  referenceUrlHint:
    "論文・記事の URL を貼り付けて欄の外をクリックすると、タイトルと説明を自動で入れます",
  referenceUrlFetching: "メタデータを取得しています…",
  referenceUrlSuccess: (title: string) => `取得しました: ${title}`,
  referenceUrlError: (message: string) => message,
  recruitingConditions: "公開・優先度",
  screeningFlow: "サブタスク",
  screeningFlowDescription: "台本・サムネ・概要欄など。行を選ぶと Pane 4 で編集",
} as const;

// ===== Pane 4: 分析比較表 =====

export const PANE4_COMPARE = {
  headerTitle: "分析比較",
  empty:
    "公開済みの動画（公開日・YouTube URL あり）がここに並びます。Pane 2 で URL を入れて Pane 3 から数値を取得してください。",
  publishDate: "公開",
  title: "タイトル",
  views: "視聴",
  impressions: "IMP",
  ctr: "CTR",
  retention: "維持率",
  overallAverage: "全体平均",
  mustReach: "必達目標",
  toggleOpen: "比較表を開く",
  toggleClose: "比較表を閉じる",
  window24h: "24h",
  window3d: "3日",
  window7d: "1週間",
  window30d: "1ヶ月",
  windowLifetime: "累計",
  milestoneSync: "マイルストーン更新",
  milestoneSyncing: "更新中…",
  milestoneHint:
    "公開日からの累計（24h≈2日目 / 3日 / 1週間 / 1ヶ月）。「マイルストーン更新」で IMP・CTR を取得",
  milestoneHintHorizontal:
    "24h / 3日 / 1週間 / 1ヶ月 / 累計を横並び表示。→ 横スクロールで全体を確認",
  pending: "未到達",
  milestoneOAuthMissing:
    "YouTube OAuth 未設定 — Vercel の Environment Variables に YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN を設定して Redeploy（手順: docs/YOUTUBE-ANALYTICS-SETUP.md）",
  milestoneSyncError: "マイルストーン取得に失敗しました",
  milestoneSyncNoData:
    "集計可能なマイルストーンがありません（公開日の翌日以降に 24h、以降 3日 / 1週間 / 1ヶ月と順に反映）",
  milestoneSyncSuccess: (count: number) =>
    `${count} 件のマイルストーン期間に数値を反映しました`,
  milestoneSyncEmpty:
    "取得は完了しましたが、数値は 0 件でした（未到達の期間、Reporting API 未設定、reach レポート未生成の可能性）",
} as const;

// ===== Pane 4 セクション id =====

export const PANE4_SECTION_IDS = {
  subtask: {
    info: "pane4-subtask-info",
    evaluation: "pane4-subtask-evaluation",
    comment: "pane4-subtask-comment",
    summary: "pane4-subtask-summary",
    attachments: "pane4-subtask-attachments",
  },
} as const;

/** Pane 4 サブタスク詳細の選択肢・見出し。 */
export const PANE4_SUBTASK = {
  formatLabel: "種別",
  formatOptions: [
    "企画メモ",
    "本編 10分",
    "ショート 1分",
    "公開準備",
  ] as const,
  decisionLabel: "進捗",
  decisionOptions: ["完了", "進行中", "見送り"] as const,
  assigneeLabel: "担当",
  assigneeOptions: [
    { value: "院スタッフ", description: "チャンネル運用担当" },
    { value: "外部編集", description: "外注・フリーランス" },
  ],
  summaryHeading: "作業メモ",
  attachmentHeading: "添付",
  referenceHeading: "参考資料",
} as const;

// ===== Pane 2（動画一覧行） =====

export const PANE2_ROW = {
  productionProgressPlaceholder: "進捗（例: 台本ドラフトまで）",
} as const;

/** Pane 2 撮影スケジュール（6〜12月・月4本 + フリー枠）。 */
export const PANE2_SCHEDULE = {
  headerTitle: "撮影スケジュール",
  headerSubtitle: "2026年6月〜12月 · 撮影月ごと",
  shootDate: "撮影日",
  videoContent: "動画の内容",
  videoContentPlaceholder: "ネタ・概要・撮影メモ",
  videoTitle: "動画タイトル",
  videoTitlePlaceholder: "YouTube タイトル案",
  thumbnailTitle: "サムネイルのタイトル",
  thumbnailTitlePlaceholder: "サムネに載せる文言",
  thumbnailImage: "使用サムネ",
  thumbnailImageAlt: "使用したサムネイル",
  thumbnailDropHint: "画像をドロップ、またはクリックして選択",
  thumbnailUploading: "アップロード中…",
  thumbnailReplace: "サムネを差し替え",
  thumbnailClear: "サムネを削除",
  publishDate: "公開日",
  url: "URL",
  urlPlaceholder: "参考URL・動画URLをドロップまたは入力",
  urlDropHint: "URLをここにドロップ",
  freeSlot: "フリー枠",
  freeNotePlaceholder: "未定のネタ・メモ・リンクなど自由に",
  slotLabel: (n: number) => `第${n}本`,
  filledSummary: (filled: number, total: number) =>
    `${filled}/${total} 枠入力済`,
  emptyTitle: "（未入力）",
} as const;

/** Pane 1 公開予定一覧。 */
export const PANE1_SECTION = {
  publishSchedule: "公開予定",
  publishScheduleEmpty: "公開日が入った枠がありません",
  publishCalendarToday: "今日",
  publishCalendarScheduled: "公開予定日",
} as const;

// ===== 画面共通文言（Phase A: 固定ラベル集約） =====

export const SYNC_UI = {
  localMode: "ローカルモード（このPCのみ・編集はリロードで消えます）",
  loading: "クラウドから読み込み中…",
  ready: "クラウド同期 ON",
  saving: "保存中…",
  saved: "保存しました",
  error: "同期エラー（オフラインまたは設定を確認）",
  remoteUpdate: "相手が更新しました。最新を読み込みますか？",
  applyRemote: "最新を反映",
  keepMine: "このまま編集",
  lastSynced: (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `更新 ${d.toLocaleString("ja-JP")}`;
  },
} as const;

export const WORKSPACE_UI = {
  workspaceDefaultName: "動画企画",
  videoPlan: "動画企画",
  addVideoPlan: "動画企画を追加",
  addVideoPlanDescription: (stageLabel: string) =>
    `「${stageLabel}」に動画企画を追加します`,
  archiveVideoPlan: "動画企画をアーカイブしますか？",
  archiveVideoPlanDescription: (title: string) =>
    `「${title}」をアーカイブします。後で「${ARCHIVED_GROUP_LABEL}」から復元できます。`,
  archiveAction: "アーカイブ",
  restore: "復元",
  addToStage: (label: string) => `${label} に動画企画を追加`,
  dragHint:
    "Space または Enter で動画企画を持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
  dragFallbackName: "動画企画",
  channel: "チャンネル",
  addChannel: "チャンネル分類を追加",
  addSeries: "シリーズを追加",
  addSeriesDescription: (channelName: string) =>
    `${channelName} に新しいシリーズを追加します`,
  seriesName: "シリーズ名",
  deleteSeries: "シリーズを削除しますか？",
} as const;
