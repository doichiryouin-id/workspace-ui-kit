/** @vitest-environment jsdom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InlineTextField } from "@/components/primitives/InlineTextField";

afterEach(() => {
  cleanup();
});

describe("InlineTextField (deferred / non-live)", () => {
  it("change 後に DOM value が1文字だけである", () => {
    const onSave = vi.fn();
    const { getByLabelText } = render(
      <InlineTextField value="" onSave={onSave} ariaLabel="動画タイトル" />,
    );
    const input = getByLabelText("動画タイトル") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "あ" } });

    expect(input.value).toBe("あ");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("IME composition 後も文字が重複しない", () => {
    const onSave = vi.fn();
    const { getByLabelText } = render(
      <InlineTextField value="" onSave={onSave} ariaLabel="サムネタイトル" />,
    );
    const input = getByLabelText("サムネタイトル") as HTMLInputElement;

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "あ" } });
    fireEvent.compositionEnd(input, { data: "あ" });

    expect(input.value).toBe("あ");
  });

  it("Esc で value prop に戻る", () => {
    const onSave = vi.fn();
    const { getByLabelText } = render(
      <InlineTextField
        value="初期値"
        onSave={onSave}
        ariaLabel="動画タイトル"
      />,
    );
    const input = getByLabelText("動画タイトル") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "編集中" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(input.value).toBe("初期値");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blur で値が変わったときだけ onSave を呼ぶ", () => {
    const onSave = vi.fn();
    const { getByLabelText } = render(
      <InlineTextField value="" onSave={onSave} ariaLabel="動画タイトル" />,
    );
    const input = getByLabelText("動画タイトル") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "新タイトル" } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("新タイトル");
  });

  it("blur で値が同じなら onSave を呼ばない", () => {
    const onSave = vi.fn();
    const { getByLabelText } = render(
      <InlineTextField
        value="既存"
        onSave={onSave}
        ariaLabel="動画タイトル"
      />,
    );
    const input = getByLabelText("動画タイトル") as HTMLInputElement;

    fireEvent.blur(input);

    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("InlineTextField (live)", () => {
  it("入力のたびに onSave を呼ぶ", () => {
    const onSave = vi.fn();
    const { getByLabelText } = render(
      <InlineTextField
        value=""
        onSave={onSave}
        ariaLabel="再生数"
        live
      />,
    );
    const input = getByLabelText("再生数") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1280" } });

    expect(onSave).toHaveBeenCalledWith("1280");
  });
});
