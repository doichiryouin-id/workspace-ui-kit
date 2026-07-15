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
      className="flex min-w-0 shrink flex-col border-r border-border bg-background"
      style={{ flex: `1 1 ${width}px` }}
    >
      <header className="flex shrink-0 border-b border-border px-3 py-2.5">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {PANE2_SCHEDULE.headerTitle}
        </h2>
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
