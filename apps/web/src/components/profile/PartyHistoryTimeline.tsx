import { cn } from "@repo/ui/lib/utils";
import type { TimelineBranch, TimelineEvent } from "./profile-page";

export interface PartyHistoryTimelineProps {
  events: TimelineEvent[];
}

export function PartyHistoryTimeline({ events }: PartyHistoryTimelineProps) {
  return (
    <div className="relative pt-3 pl-2">
      {events.map((event, index) => (
        <TimelineNodeItem
          key={event.id}
          event={event}
          isLastEvent={index === events.length - 1}
        />
      ))}
    </div>
  );
}

function TimelineNodeItem({
  event,
  isLastEvent,
}: {
  event: TimelineEvent;
  isLastEvent: boolean;
}) {
  const hasBranches = Boolean(event.branches && event.branches.length > 0);

  return (
    <div className="relative">
      {/* Event Header: Primary Dot + Horizontal Segment + Event Title */}
      <div className="flex items-center">
        {/* Primary Circular Node */}
        <div className="relative z-10 size-3.5 rounded-full bg-[#97a9cf] dark:bg-chart-1 ring-4 ring-background shrink-0" />

        {/* Horizontal connector from Primary Dot to Text */}
        <div className="w-8 h-0.5 bg-[#97a9cf] dark:bg-chart-1 shrink-0" />

        {/* Event Label */}
        <h4 className="pl-3 font-bold text-[15px] tracking-tight text-c-100 whitespace-nowrap">
          {event.year} - {event.title}
        </h4>
      </div>

      {/* Vertical trunk connecting nodes and carrying branches */}
      <div className="relative ml-1.5">
        {(!isLastEvent || hasBranches) && (
          <div
            className={cn(
              "absolute left-0 top-0 w-0.5 bg-[#97a9cf] dark:bg-chart-1",
              isLastEvent ? "h-full" : "h-[calc(100%+16px)]",
            )}
          />
        )}

        {/* Sub-branch horizontal lines */}
        {hasBranches && (
          <div className="py-5 space-y-7 pl-0">
            {event.branches?.map((branch) => (
              <TimelineBranchItem key={branch.id} branch={branch} />
            ))}
          </div>
        )}

        {!hasBranches && !isLastEvent && <div className="h-14" />}
      </div>
    </div>
  );
}

function TimelineBranchItem({ branch }: { branch: TimelineBranch }) {
  return (
    <div className="relative flex items-center">
      {/* Horizontal branch line from vertical trunk */}
      <div className="w-20 md:w-28 h-[1.5px] bg-[#97a9cf] dark:bg-chart-1 shrink-0" />

      {/* Small Terminal Dot */}
      <div className="size-2 rounded-full bg-[#97a9cf] dark:bg-chart-1 shrink-0 -ml-1 z-10" />

      {/* Sub-branch Title */}
      <span className="pl-3 text-[13px] font-medium text-c-80">
        {branch.title}
      </span>
    </div>
  );
}

export { PartyHistoryTimeline as PartyHistoryTab };
