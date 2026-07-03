"use client";

/**
 * InlineTextField — Pane 4 編集 UI の「1 行 input」プリミティブ。
 *
 * shadcn `<Input>` をラップし、Lab v3 で確定した規律で編集体験を統一する:
 *   - 常に `<Input>` 表示（Type-direct、ADR-0014）
 *   - `border-input` + `bg-card` で「手前」感を出し、編集可能と一目で分かる
 *   - 保存: blur / Enter（値が変わっていれば onSave）
 *   - キャンセル: Esc で value に戻して blur
 *
 * ADR-0014 で旧 ADR-0010 §6 D R5「shadcn Input MUST 禁止」を撤回。
 * 雛形では候補者の「氏名・採用担当・連絡先・希望年収（min/max）」等で再利用。
 */

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type InlineTextFieldProps = {
  /** 現在の値（空文字で「未設定」placeholder 表示） */
  value: string;
  /** 値が変わって blur した時に呼ばれる */
  onSave: (v: string) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** input の type 属性（`text` / `email` / `tel` / `number`） */
  inputType?: "text" | "email" | "tel" | "number";
  /** 空のときの placeholder。デフォルト "未設定" */
  placeholder?: string;
  /** className override（width 制限などに使う） */
  className?: string;
  /** true のとき入力のたびに onSave（Pane 3 分析数値 → 上段カード連動） */
  live?: boolean;
};

type SharedInputProps = Pick<
  InlineTextFieldProps,
  "value" | "onSave" | "ariaLabel" | "inputType" | "placeholder" | "className"
>;

function DeferredInlineTextField({
  value,
  onSave,
  ariaLabel,
  inputType = "text",
  placeholder,
  className,
}: SharedInputProps) {
  return (
    <Input
      key={value}
      type={inputType}
      defaultValue={value}
      placeholder={placeholder ?? "未設定"}
      aria-label={ariaLabel}
      onBlur={(e) => {
        if (e.target.value !== value) onSave(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          (e.target as HTMLInputElement).value = value;
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn("h-8 bg-card", className)}
    />
  );
}

function LiveInlineTextField({
  value,
  onSave,
  ariaLabel,
  inputType = "text",
  placeholder,
  className,
}: SharedInputProps) {
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  return (
    <Input
      type={inputType}
      value={draft}
      placeholder={placeholder ?? "未設定"}
      aria-label={ariaLabel}
      onChange={(e) => {
        setDraft(e.target.value);
        onSave(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setDraft(value);
          if (draft !== value) onSave(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn("h-8 bg-card", className)}
    />
  );
}

export function InlineTextField({
  live = false,
  ...props
}: InlineTextFieldProps) {
  if (live) {
    return <LiveInlineTextField {...props} />;
  }
  return <DeferredInlineTextField {...props} />;
}
