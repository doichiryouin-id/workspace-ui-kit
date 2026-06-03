"use client";

import { type PublishScheduleListItem } from "@/lib/computed/shooting-schedule";
import { PANE1_SECTION } from "@/lib/labels";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PositionPaneProps = {
  workspaceName: string;
  publishItems: PublishScheduleListItem[];
  selectedPublishId: string | null;
  onSelectPublish: (id: string) => void;
};

export function PositionPane({
  workspaceName,
  publishItems,
  selectedPublishId,
  onSelectPublish,
}: PositionPaneProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
          <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {workspaceName}
          </h2>
          <Pane1Toggle />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-1 py-3 group-data-[collapsible=icon]:hidden">
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
            {PANE1_SECTION.publishSchedule}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {publishItems.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                {PANE1_SECTION.publishScheduleEmpty}
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5 px-1">
                {publishItems.map((item) => {
                  const active = selectedPublishId === item.id;
                  return (
                    <li key={item.id}>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              onClick={() => onSelectPublish(item.id)}
                              className={
                                active
                                  ? "w-full min-w-0 truncate rounded-md bg-sidebar-accent px-2 py-1.5 text-left text-xs text-sidebar-accent-foreground"
                                  : "w-full min-w-0 truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-sidebar-accent/60"
                              }
                            >
                              <span className="mr-1.5 tabular-nums font-medium text-foreground">
                                {item.publishDateLabel}
                              </span>
                              <span className="text-muted-foreground">
                                {item.title}
                              </span>
                            </button>
                          }
                        />
                        <TooltipContent side="right">
                          <p className="text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            公開 {item.publishDate}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
