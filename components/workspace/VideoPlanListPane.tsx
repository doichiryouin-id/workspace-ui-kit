"use client";

import {
  ShootingSchedulePane,
  type ShootingSchedulePatch,
} from "@/components/workspace/ShootingSchedulePane";
import { PANE2_SCHEDULE } from "@/lib/labels";
import { type ShootingScheduleEntry } from "@/lib/schema";

type VideoPlanListPaneProps = {
  shootingSchedule: ShootingScheduleEntry[];
  selectedShootingScheduleId: string | null;
  onSelectShootingScheduleEntry: (id: string) => void;
  onUpdateShootingScheduleEntry: (
    id: string,
    patch: ShootingSchedulePatch,
  ) => void;
  width: number;
};

export function VideoPlanListPane({
  shootingSchedule,
  selectedShootingScheduleId,
  onSelectShootingScheduleEntry,
  onUpdateShootingScheduleEntry,
  width,
}: VideoPlanListPaneProps) {
  return (
    <section
      className="flex shrink-0 flex-col border-r border-border bg-background"
      style={{ width }}
    >
      <header className="flex shrink-0 flex-col gap-0.5 border-b border-border px-3 py-2.5">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {PANE2_SCHEDULE.headerTitle}
        </h2>
        <p className="truncate text-xs text-muted-foreground">
          {PANE2_SCHEDULE.headerSubtitle}
        </p>
      </header>
      <ShootingSchedulePane
        entries={shootingSchedule}
        selectedEntryId={selectedShootingScheduleId}
        onSelectEntry={onSelectShootingScheduleEntry}
        onUpdateEntry={onUpdateShootingScheduleEntry}
      />
    </section>
  );
}
