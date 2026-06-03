import { cn } from "@/lib/utils";

export type ShibaExpression = "default" | "working";

type ShibaAvatarIconProps = {
  className?: string;
  /** 制作中は少し頑張っている表情。 */
  expression?: ShibaExpression;
};

const FUR = "var(--chart-3)";
const MARK = "var(--card)";
const INK = "var(--foreground)";
const COLLAR = "var(--destructive)";

/** 丸みのある三角耳（参考イラスト寄り） */
function ShibaEar({ side }: { side: "left" | "right" }) {
  const outer =
    side === "left"
      ? "M10.2 9.8 L7.2 4.4 L13.2 8.2 Z"
      : "M21.8 9.8 L24.8 4.4 L18.8 8.2 Z";
  const inner =
    side === "left"
      ? "M10 9.2 L8.6 6.2 L11.8 8.2 Z"
      : "M22 9.2 L23.4 6.2 L20.2 8.2 Z";

  return (
    <>
      <path
        fill={FUR}
        stroke={FUR}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        d={outer}
      />
      <path fill={MARK} d={inner} />
    </>
  );
}

/** 左後方の巻き尻尾（胴から離し、先端は裏白） */
function ShibaTail() {
  return (
    <>
      <path
        fill="none"
        stroke={FUR}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.2 25.6
           C6.8 24.8 4 21.2 4.4 17.4
           C4.8 14.2 7.8 12.8 9.6 15.2"
      />
      <circle cx="4.1" cy="16.4" r="2.1" fill={FUR} />
      <circle cx="4.1" cy="16.4" r="1.1" fill={MARK} />
    </>
  );
}

/** 動画企画アバター用の柴犬イラスト（32×32 viewBox）。 */
export function ShibaAvatarIcon({
  className,
  expression = "default",
}: ShibaAvatarIconProps) {
  const working = expression === "working";

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <ShibaTail />

      {/* 座り姿の丸いシルエット */}
      <path
        fill={FUR}
        d="M16 4
           C22.8 4 27.5 8.2 27.5 13.2
           c0 2.6-.9 5-2.4 6.8
           1.8 1.4 3 3.6 3 6.2
           0 4.2-4.2 7.3-10.1 7.3S8 24.4 8 20.2
           c0-2.6 1.2-4.8 3-6.2
           -1.5-1.8-2.4-4.2-2.4-6.8
           C8.5 8.2 13.2 4 16 4Z"
      />

      {/* 胸の裏白 */}
      <ellipse cx="16" cy="23.2" rx="5.2" ry="4.6" fill={MARK} />

      <ShibaEar side="left" />
      <ShibaEar side="right" />

      {/* 口周りの白 */}
      <ellipse cx="16" cy="18.2" rx="6.2" ry="5.2" fill={MARK} />

      {/* 首輪 */}
      <path
        fill="none"
        stroke={COLLAR}
        strokeWidth={1.35}
        strokeLinecap="round"
        d="M10.8 21.2c2.8 1.2 7.6 1.2 10.4 0"
      />

      {/* 前足（小さく） */}
      <ellipse cx="12.2" cy="28.2" rx="1.6" ry="1.1" fill={FUR} />
      <ellipse cx="19.8" cy="28.2" rx="1.6" ry="1.1" fill={FUR} />
      <ellipse cx="12.2" cy="28.4" rx="1.1" ry="0.55" fill={MARK} />
      <ellipse cx="19.8" cy="28.4" rx="1.1" ry="0.55" fill={MARK} />

      <ellipse cx="16" cy="17.2" rx="1.5" ry="1.1" fill={INK} />

      {working ? <ShibaFaceWorking /> : <ShibaFaceDefault />}
    </svg>
  );
}

/** 参考イラスト風：まろ眉スポット＋丸目＋W字口 */
function ShibaFaceDefault() {
  return (
    <>
      <ellipse cx="11.8" cy="11.6" rx="1.15" ry="0.75" fill={MARK} />
      <ellipse cx="20.2" cy="11.6" rx="1.15" ry="0.75" fill={MARK} />
      <circle cx="12" cy="14.2" r="1.15" fill={INK} />
      <circle cx="20" cy="14.2" r="1.15" fill={INK} />
      <path
        fill="none"
        stroke={INK}
        strokeWidth={0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.2 19.3 15.3 20.3 16 19.5 16.7 20.3 17.8 19.3"
      />
    </>
  );
}

/** 制作中：目を細め、汗 */
function ShibaFaceWorking() {
  return (
    <>
      <ellipse
        cx="11.6"
        cy="11.8"
        rx="1.1"
        ry="0.7"
        fill={MARK}
        transform="rotate(12 11.6 11.8)"
      />
      <ellipse
        cx="20.4"
        cy="11.8"
        rx="1.1"
        ry="0.7"
        fill={MARK}
        transform="rotate(-12 20.4 11.8)"
      />
      <ellipse cx="12" cy="14.4" rx="1.35" ry="0.75" fill={INK} />
      <ellipse cx="20" cy="14.4" rx="1.35" ry="0.75" fill={INK} />
      <path
        fill="none"
        stroke={INK}
        strokeWidth={0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.3 19.5 15.3 20.2 16 19.6 16.7 20.2 17.7 19.5"
      />
      <path
        fill="var(--stage-in-production-border)"
        d="M23.4 7.4c.55-.1.95.35.85.95-.2 1-1.3 1.45-2 .85-.45-.45-.25-1.3.45-1.5l.7-.3Z"
      />
    </>
  );
}
