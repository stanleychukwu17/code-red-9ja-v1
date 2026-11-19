import { useEffect, useState } from "react";
import { Button } from "@repo/ui/components/button";
import { GreyCardWrapper } from "./Shared";
import { CheckCircle2, Clock, Radio, ArrowRight } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

interface ElectionUpdatesProgressCardProps {
  assignment: {
    id?: number | string;
    updates_count?: number;
    last_update_at?: string | null;
  };
  targetUpdates?: number;
  intervalMinutes?: number;
  onPostUpdateClick: () => void;
}

/**
 * Election Updates Progress Card.
 *
 * Displays:
 * 1. Progress Indicator: "Election Updates: X / 18" with a visual progress bar and percentage earned.
 * 2. Interval Status Badge:
 *    - Ready (Green): "Post your HH:MM–HH:MM update"
 *    - Recorded (Grey): "Interval covered. Next window opens at HH:MM (in Xm)"
 */
export function ElectionUpdatesProgressCard({
  assignment,
  targetUpdates = 18,
  intervalMinutes = 30,
  onPostUpdateClick,
}: ElectionUpdatesProgressCardProps) {
  const [now, setNow] = useState<Date>(new Date());

  // Keep interval window and remaining minutes live (updates every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const updatesCount = assignment.updates_count ?? 0;
  const progressPct = Math.min(100, Math.round((updatesCount / targetUpdates) * 100));

  // Compute current interval window
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const bucketStartMin = Math.floor(currentMinute / intervalMinutes) * intervalMinutes;
  const bucketEndMin = bucketStartMin + intervalMinutes;

  const nextHour = bucketEndMin >= 60 ? (currentHour + 1) % 24 : currentHour;
  const nextMin = bucketEndMin % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const windowStartStr = `${pad(currentHour)}:${pad(bucketStartMin)}`;
  const windowEndStr = `${pad(nextHour)}:${pad(nextMin)}`;

  // Minutes remaining in current interval window
  const minutesRemaining = bucketEndMin - currentMinute;

  // Determine if the last update falls in the current interval bucket
  let isCurrentIntervalCovered = false;
  if (assignment.last_update_at) {
    const lastDate = new Date(assignment.last_update_at);
    const isSameDay =
      lastDate.getFullYear() === now.getFullYear() &&
      lastDate.getMonth() === now.getMonth() &&
      lastDate.getDate() === now.getDate();

    if (isSameDay) {
      const lastHour = lastDate.getHours();
      const lastBucketMin = Math.floor(lastDate.getMinutes() / intervalMinutes) * intervalMinutes;
      if (lastHour === currentHour && lastBucketMin === bucketStartMin) {
        isCurrentIntervalCovered = true;
      }
    }
  }

  return (
    <GreyCardWrapper>
      {/* Top Header & Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-c-90">Election Updates</span>
        </div>
        <span className="text-sm font-extrabold text-c-90 tracking-tight">
          <span className="text-green text-base">{updatesCount}</span> / {targetUpdates}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mt-1">
        <div className="w-full bg-c-10 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-green h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-c-50">
          <span>{progressPct}% of updates payout earned</span>
          <span>{Math.max(0, targetUpdates - updatesCount)} remaining</span>
        </div>
      </div>

      {/* Interval Status Badge */}
      <div className="mt-2 pt-2 border-t border-c-10">
        {isCurrentIntervalCovered ? (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-c-10/70 border border-c-20 text-c-70">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="size-4 shrink-0 text-c-50" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate text-c-90">Interval covered</span>
                <span className="text-[11px] text-c-50 truncate">
                  Next window opens at {windowEndStr} (in {minutesRemaining}m)
                </span>
              </div>
            </div>
            <Clock className="size-4 text-c-40 shrink-0" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-green/10 border border-green/30 text-green">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-green"></span>
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate text-foreground">
                  Post your {windowStartStr}–{windowEndStr} update
                </span>
                <span className="text-[11px] text-c-60 truncate">
                  {minutesRemaining}m remaining in this window
                </span>
              </div>
            </div>
            <Radio className="size-4 text-green shrink-0 animate-pulse" />
          </div>
        )}
      </div>

      {/* Action CTA Button */}
      <Button
        type="button"
        size="large"
        onClick={onPostUpdateClick}
        className={cn(
          "w-full rounded-12 mt-1 text-sm font-semibold transition-all",
          isCurrentIntervalCovered
            ? "bg-c-15 hover:bg-c-20 text-c-80 border border-c-20"
            : "bg-green hover:bg-green/90 text-black shadow-sm"
        )}
      >
        <span>{isCurrentIntervalCovered ? "Post Additional Update" : "Post Update Now"}</span>
        <ArrowRight className="size-4 ml-1" />
      </Button>
    </GreyCardWrapper>
  );
}
