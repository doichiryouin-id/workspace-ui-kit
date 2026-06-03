"use client";

/**
 * Pane 4: 選考ステージ詳細パネル（ADR-0015 §19 でモード 1 を廃止）。
 *
 * ステージ詳細のみ表示する。候補者詳細（旧モード 1）は Pane 3 のヘッダー帯
 * トグル内に移管済み。起動時は畳まれた 48px 帯で、Pane 3 のステージカード
 * クリックで自動展開する。
 *
 * 規律:
 *   - components/primitives/ の Inline* primitive を使う（shadcn 標準フォーム）
 *   - AttachmentList を再利用（添付セクション）
 *   - AxisScoreRow を VideoPlanDashboardPane から import
 *   - ステージ切替時の state リセットは `key` 再マウントで
 *
 * `SelectedDetail` 型は `lib/schema.ts` に集約（Phase 3A）。
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";

import {
  type AxisKey,
  type Subtask,
  type SelectedDetail,
  AXIS_ORDER,
} from "@/lib/schema";
import { EVALUATION_AXIS, PANE4_SECTION_IDS, PANE4_SUBTASK } from "@/lib/labels";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  InlineTextField,
  InlineDateField,
  InlineSelectField,
  InlineComboboxField,
  InlineTextareaField,
  InlineFieldRow,
  type ComboOption,
} from "@/components/primitives";
import { Pane4Section } from "@/components/workspace/Pane4Section";
import { AxisScoreRow } from "@/components/workspace/AxisScoreRow";
import { AttachmentList } from "@/components/workspace/AttachmentList";

// ===== Pane 4 内部型（ファイル外には出さない） =====

/**
 * Pane 4 モード 2 で inline 編集できる Subtask のキー集合。
 * `onUpdateSubtaskField` の `field` 引数の型として親 (Workspace.tsx) と整合させる。
 *
 * 旧実装は `date / format / assignee / decision` の 4 フィールドのみだったが、
 * ADR-0014 でコメント / 要約も `InlineTextareaField` で編集対象にしたため
 * `comment` / `summary` を追加した。Workspace.tsx 側の `EditableSubtaskKey`
 * 再宣言も同形に揃える必要がある（型を export しない設計のため両側で宣言する規律）。
 */
type EditableSubtaskKey =
  | "label"
  | "date"
  | "format"
  | "assignee"
  | "decision"
  | "comment"
  | "summary";

// ===== Pane 4 サブタスク詳細 =====

const ASSIGNEE_OPTIONS: ComboOption[] = PANE4_SUBTASK.assigneeOptions.map(
  (o) => ({ value: o.value, description: o.description }),
);

function SubtaskDetail({
  subtask,
  onUpdateAxis,
  onUpdateSubtaskField,
}: {
  subtask: Subtask;
  onUpdateAxis: (subtaskId: string, axis: AxisKey, value: number | null) => void;
  onUpdateSubtaskField: (
    subtaskId: string,
    field: EditableSubtaskKey,
    value: string,
  ) => void;
}) {
  const [assigneeOptions, setAssigneeOptions] = useState<ComboOption[]>(
    ASSIGNEE_OPTIONS,
  );

  const handleAddAssignee = (newOpt: ComboOption) =>
    setAssigneeOptions((prev) =>
      prev.find((o) => o.value === newOpt.value) ? prev : [...prev, newOpt],
    );

  return (
    <div className="px-4 py-4">
      <Pane4Section id={PANE4_SECTION_IDS.subtask.info} title="基本情報">
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="タイトル">
            <InlineTextField
              value={subtask.label}
              onSave={(v) => onUpdateSubtaskField(subtask.id, "label", v)}
              ariaLabel="サブタスク名"
            />
          </InlineFieldRow>
          <InlineFieldRow label="日時">
            <InlineDateField
              value={subtask.date}
              onSave={(v) => onUpdateSubtaskField(subtask.id, "date", v)}
              ariaLabel="日時"
            />
          </InlineFieldRow>
          <InlineFieldRow label={PANE4_SUBTASK.formatLabel}>
            <InlineSelectField
              value={subtask.format}
              options={PANE4_SUBTASK.formatOptions}
              onSave={(v) => onUpdateSubtaskField(subtask.id, "format", v)}
              ariaLabel={PANE4_SUBTASK.formatLabel}
            />
          </InlineFieldRow>
          <InlineFieldRow label={PANE4_SUBTASK.assigneeLabel}>
            <InlineComboboxField
              value={subtask.assignee}
              options={assigneeOptions}
              onSave={(v) => onUpdateSubtaskField(subtask.id, "assignee", v)}
              onCreate={handleAddAssignee}
              ariaLabel={PANE4_SUBTASK.assigneeLabel}
            />
          </InlineFieldRow>
          <InlineFieldRow label={PANE4_SUBTASK.decisionLabel}>
            <InlineSelectField
              value={subtask.decision ?? ""}
              options={PANE4_SUBTASK.decisionOptions}
              onSave={(v) => onUpdateSubtaskField(subtask.id, "decision", v)}
              ariaLabel={PANE4_SUBTASK.decisionLabel}
            />
          </InlineFieldRow>
        </dl>
      </Pane4Section>

      <Separator />

      <Pane4Section id={PANE4_SECTION_IDS.subtask.evaluation} title="制作チェック">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-3">
          {AXIS_ORDER.map((key) => (
            <AxisScoreRow
              key={key}
              label={EVALUATION_AXIS[key]}
              value={subtask.axisScores[key]}
              editable
              onChange={(v) => onUpdateAxis(subtask.id, key, v)}
              onReset={() => onUpdateAxis(subtask.id, key, null)}
            />
          ))}
        </div>
      </Pane4Section>

      <Separator />

      <Pane4Section
        id={PANE4_SECTION_IDS.subtask.comment}
        title="メモ"
        className="gap-2"
      >
        <InlineTextareaField
          value={subtask.comment ?? ""}
          onSave={(v) => onUpdateSubtaskField(subtask.id, "comment", v)}
          ariaLabel="メモ"
        />
      </Pane4Section>

      <Separator />

      <Pane4Section
        id={PANE4_SECTION_IDS.subtask.summary}
        title={PANE4_SUBTASK.summaryHeading}
        className="gap-2"
      >
        <InlineTextareaField
          value={subtask.summary ?? ""}
          onSave={(v) => onUpdateSubtaskField(subtask.id, "summary", v)}
          ariaLabel={PANE4_SUBTASK.summaryHeading}
        />
      </Pane4Section>

      <Separator />

      <Pane4Section
        id={PANE4_SECTION_IDS.subtask.attachments}
        title={PANE4_SUBTASK.attachmentHeading}
      >
        <AttachmentList items={subtask.attachments} />
      </Pane4Section>
    </div>
  );
}


export function VideoPlanDetailPane({
  selectedVideoPlanId,
  subtasks,
  selectedDetail,
  scrollAnchor,
  onScrollAnchorConsumed,
  onUpdateAxis,
  onUpdateSubtaskField,
  pane4Open,
  onTogglePane4,
}: {
  selectedVideoPlanId: string;
  subtasks: Subtask[];
  selectedDetail: SelectedDetail;
  scrollAnchor: string | null;
  onScrollAnchorConsumed: () => void;
  onUpdateAxis: (subtaskId: string, axis: AxisKey, value: number | null) => void;
  onUpdateSubtaskField: (
    subtaskId: string,
    field: EditableSubtaskKey,
    value: string,
  ) => void;
  pane4Open: boolean;
  onTogglePane4: () => void;
}) {
  useEffect(() => {
    if (!scrollAnchor) return;
    const id = requestAnimationFrame(() => {
      document
        .getElementById(scrollAnchor)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
      onScrollAnchorConsumed();
    });
    return () => cancelAnimationFrame(id);
  }, [scrollAnchor, onScrollAnchorConsumed]);

  const activeSubtask =
    selectedDetail?.type === "subtask"
      ? subtasks.find((s) => s.id === selectedDetail.id)
      : undefined;

  const heading = activeSubtask?.label ?? "サブタスク詳細";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "overflow-hidden transition-[width] duration-200 ease-linear",
        pane4Open ? "w-[400px]" : "w-12",
      )}
    >
      {pane4Open ? (
        <>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <h2 className="flex-1 truncate text-sm font-semibold text-foreground">
              {heading}
            </h2>
            <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
          </header>

          <ScrollArea className="min-h-0 flex-1">
            {activeSubtask ? (
              <SubtaskDetail
                key={`${selectedVideoPlanId}-${activeSubtask.id}`}
                subtask={activeSubtask}
                onUpdateAxis={onUpdateAxis}
                onUpdateSubtaskField={onUpdateSubtaskField}
              />
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Pane 3 のサブタスクを選択すると、ここで編集できます。
              </p>
            )}
          </ScrollArea>
        </>
      ) : (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-border">
          <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
        </div>
      )}
    </aside>
  );
}
