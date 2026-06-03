"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { type DayProps } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { getScheduledPublishIsoDates } from "@/lib/computed/publish-schedule";
import { PANE1_SECTION } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { type VideoPlan } from "@/lib/schema";

type PublishScheduleCalendarProps = {
  videoPlans: VideoPlan[];
};

function createPublishScheduleDay(scheduledIsoDates: ReadonlySet<string>) {
  return function PublishScheduleDay({
    day,
    modifiers,
    className,
    children,
    ...props
  }: DayProps) {
    const isScheduled =
      Boolean(modifiers.scheduled) || scheduledIsoDates.has(day.isoDate);

    return (
      <td
        {...props}
        className={cn(className, isScheduled && "publish-schedule-day")}
        data-scheduled={isScheduled || undefined}
      >
        {children}
        {isScheduled ? (
          <span
            aria-hidden
            className="publish-schedule-dot pointer-events-none absolute bottom-0.5 left-1/2 z-50 size-2.5 -translate-x-1/2 rounded-full bg-destructive shadow-[0_0_0_1px_var(--color-background)]"
          />
        ) : null}
      </td>
    );
  };
}

/** Pane 1 下部: 全企画の公開予定日を月表示で俯瞰する。 */
export function PublishScheduleCalendar({
  videoPlans,
}: PublishScheduleCalendarProps) {
  const [month, setMonth] = useState(() => new Date());
  const scheduledIsoDates = useMemo(
    () => new Set(getScheduledPublishIsoDates(videoPlans)),
    [videoPlans],
  );

  const isScheduledDay = useCallback(
    (date: Date) => scheduledIsoDates.has(format(date, "yyyy-MM-dd")),
    [scheduledIsoDates],
  );

  const Day = useCallback(
    createPublishScheduleDay(scheduledIsoDates),
    [scheduledIsoDates],
  );

  return (
    <div className="flex flex-col gap-2">
      <Calendar
        locale={ja}
        month={month}
        onMonthChange={setMonth}
        showOutsideDays={false}
        captionLayout="label"
        modifiers={{ scheduled: isScheduledDay }}
        modifiersClassNames={{ scheduled: "publish-schedule-day" }}
        components={{ Day }}
        classNames={{
          today:
            "rounded-(--cell-radius) bg-primary/20 font-semibold text-primary ring-1 ring-inset ring-primary/40",
        }}
        className="w-full overflow-visible bg-transparent p-0 [--cell-size:--spacing(6)]"
      />
      <PublishScheduleCalendarLegend />
    </div>
  );
}

function PublishScheduleCalendarLegend() {
  return (
    <ul className="flex flex-col gap-1 px-1 text-[10px] text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span
          className="size-3 shrink-0 rounded-sm bg-primary/20 ring-1 ring-inset ring-primary/40"
          aria-hidden="true"
        />
        <span>{PANE1_SECTION.publishCalendarToday}</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="relative flex size-3 shrink-0 items-end justify-center"
          aria-hidden="true"
        >
          <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_0_1px_var(--color-background)]" />
        </span>
        <span>{PANE1_SECTION.publishCalendarScheduled}</span>
      </li>
    </ul>
  );
}
