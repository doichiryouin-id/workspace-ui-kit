import { Workspace } from "@/components/workspace/Workspace";
import positionsData from "@/data/positions.json";
import shootingScheduleData from "@/data/shooting-schedule.json";
import videoPlansData from "@/data/video-plans.json";
import workspaceData from "@/data/workspace.json";
import {
  channelsSchema,
  shootingScheduleSchema,
  videoPlansSchema,
  workspaceSchema,
} from "@/lib/schema";

export default function Page() {
  const channelResult = channelsSchema.safeParse(positionsData);
  const planResult = videoPlansSchema.safeParse(videoPlansData);
  const scheduleResult = shootingScheduleSchema.safeParse(shootingScheduleData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (
    !channelResult.success ||
    !planResult.success ||
    !scheduleResult.success ||
    !wsResult.success
  ) {
    const errors = [
      !channelResult.success &&
        `positions.json: ${channelResult.error.issues[0]?.message}`,
      !planResult.success &&
        `video-plans.json: ${planResult.error.issues[0]?.message}`,
      !scheduleResult.success &&
        `shooting-schedule.json: ${scheduleResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <Workspace
      initialChannels={channelResult.data}
      initialVideoPlans={planResult.data}
      initialShootingSchedule={scheduleResult.data}
      workspace={wsResult.data}
    />
  );
}
