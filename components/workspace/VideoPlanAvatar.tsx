import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ShibaAvatarIcon,
  type ShibaExpression,
} from "@/components/primitives/ShibaAvatarIcon";
import { type StageKey } from "@/lib/schema";
import { cn } from "@/lib/utils";

type VideoPlanAvatarProps = {
  /** スクリーンリーダー向け（表示は柴犬アイコンのみ）。 */
  name: string;
  selected?: boolean;
  size?: "row" | "header";
  /** 制作中は頑張っている表情に切り替える。 */
  stage?: StageKey;
  className?: string;
};

const sizeStyles = {
  row: { avatar: "size-8", icon: "size-7" },
  header: { avatar: "size-16", icon: "size-14" },
} as const;

function expressionForStage(stage?: StageKey): ShibaExpression {
  return stage === "inProduction" ? "working" : "default";
}

/** Pane 2 / 3 の動画企画アバター（タイトル頭文字の代わりに柴犬）。 */
export function VideoPlanAvatar({
  name,
  selected = false,
  size = "row",
  stage,
  className,
}: VideoPlanAvatarProps) {
  const styles = sizeStyles[size];

  return (
    <Avatar className={cn(styles.avatar, "shrink-0", className)}>
      <AvatarFallback
        className={cn(
          "overflow-hidden p-0",
          selected
            ? "bg-accent-foreground/10 text-accent-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <ShibaAvatarIcon
          className={styles.icon}
          expression={expressionForStage(stage)}
        />
        <span className="sr-only">{name}</span>
      </AvatarFallback>
    </Avatar>
  );
}
