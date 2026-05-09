"use client";

import { useState } from "react";
import { MoreHorizontal, Plus, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { type Group, type StageKey } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";

type CandidateListPaneProps = {
  groups: Group[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: (stage: StageKey, name: string) => void;
  onDeleteCandidate: (id: string) => void;
};

export function CandidateListPane({
  groups,
  selectedCandidateId,
  onSelectCandidate,
  onAddCandidate,
  onDeleteCandidate,
}: CandidateListPaneProps) {
  const [addDialogStage, setAddDialogStage] = useState<{
    stage: StageKey;
    label: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <section className="flex w-[280px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          フロントエンドエンジニア
        </h2>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-3 py-4">
          {groups.map((group) => (
            <div key={group.stage}>
              <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between gap-2 bg-background px-5 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h3 className="truncate text-xs font-medium text-muted-foreground">
                    {group.label}
                  </h3>
                  <Badge variant="secondary" size="xs">
                    {group.items.length}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    setAddDialogStage({
                      stage: group.stage,
                      label: group.label,
                    })
                  }
                  aria-label={`${group.label} に候補者を追加`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
              <ul className="flex flex-col gap-1">
                {group.items.map((cand) => {
                  const selected = cand.id === selectedCandidateId;
                  return (
                    <li key={cand.id} className="group/candidate relative">
                      <button
                        type="button"
                        onClick={() => onSelectCandidate(cand.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
                          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          selected
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {cand.name[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{cand.name}</p>
                        </div>
                        <span className="transition-opacity group-focus-within/candidate:opacity-0 group-hover/candidate:opacity-0">
                          <ScoreBadge
                            avg={cand.averageScore}
                            selected={selected}
                          />
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className={cn(
                                "absolute top-1/2 right-1 -translate-y-1/2",
                                "opacity-0 group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
                                "transition-opacity",
                                "text-muted-foreground hover:text-foreground",
                              )}
                              aria-label={`${cand.name} の操作`}
                            >
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() =>
                                setDeleteTarget({
                                  id: cand.id,
                                  name: cand.name,
                                })
                              }
                            >
                              <Trash2 />
                              削除
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </ScrollArea>

      {addDialogStage && (
        <AddItemDialog
          open={addDialogStage !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogStage(null);
          }}
          title="候補者を追加"
          description={`「${addDialogStage.label}」ステージに候補者を追加します`}
          fieldLabel="氏名"
          fieldId="candidate-name"
          placeholder="例: 山田 太郎"
          onAdd={(name) => onAddCandidate(addDialogStage.stage, name)}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="候補者を削除しますか？"
        itemName={deleteTarget?.name ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteCandidate(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </section>
  );
}

function ScoreBadge({
  avg,
  selected,
}: {
  avg: number | null;
  selected: boolean;
}) {
  if (avg === null) {
    return (
      <span
        className={cn(
          "shrink-0 text-xs",
          selected ? "text-accent-foreground/80" : "text-muted-foreground",
        )}
        aria-label="未評価"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
        selected ? "text-accent-foreground" : "text-foreground/80",
      )}
      aria-label={`平均スコア ${avg.toFixed(1)} / 5`}
    >
      <Star aria-hidden className="size-3 fill-current" />
      {avg.toFixed(1)}
    </span>
  );
}
