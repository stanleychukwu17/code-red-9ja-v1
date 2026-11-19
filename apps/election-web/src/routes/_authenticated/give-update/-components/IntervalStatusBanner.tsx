import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Radio } from "lucide-react";

interface IntervalStatusBannerProps {
  updatesCount?: number;
  lastUpdateAt?: string | null;
  targetUpdates?: number;
  intervalMinutes?: number;
}

/**
 * Status banner showing the agent their current 30-minute interval coverage and daily progress (X / 20).
 */
export function IntervalStatusBanner({
  updatesCount = 0,
  lastUpdateAt,
  targetUpdates = 20,
  intervalMinutes = 30,
}: IntervalStatusBannerProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const bucketStartMin = Math.floor(currentMinute / intervalMinutes) * intervalMinutes;
  const bucketEndMin = bucketStartMin + intervalMinutes;

  const nextHour = bucketEndMin >= 60 ? (currentHour + 1) % 24 : currentHour;
  const nextMin = bucketEndMin % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const windowStartStr = `${pad(currentHour)}:${pad(bucketStartMin)}`;
  const windowEndStr = `${pad(nextHour)}:${pad(nextMin)}`;

  const minutesRemaining = bucketEndMin - currentMinute;

  let isCurrentIntervalCovered = false;
  if (lastUpdateAt) {
    const lastDate = new Date(lastUpdateAt);
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

  const progressPct = Math.min(100, Math.round((updatesCount / targetUpdates) * 100));

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted-foreground">
          Election Updates:{" "}
          <span className="text-foreground font-bold">
            {updatesCount} / {targetUpdates}
          </span>
        </span>
        <span className="text-muted-foreground font-medium">{progressPct}% earned</span>
      </div>

      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div>
        {isCurrentIntervalCovered ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <span className="truncate">
                Interval covered. Next window opens at <strong className="text-foreground">{windowEndStr}</strong> (in {minutesRemaining}m)
              </span>
            </div>
            <Clock className="size-3.5 shrink-0 opacity-60" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="size-4 shrink-0 animate-pulse text-emerald-500" />
              <span className="font-semibold truncate">
                Ready: Post your {windowStartStr}–{windowEndStr} update ({minutesRemaining}m left)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
