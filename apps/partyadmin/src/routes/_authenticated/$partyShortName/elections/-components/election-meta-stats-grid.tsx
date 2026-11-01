import { Calendar, Layers, Podcast } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

export type ElectionMetaStatsGridProps = {
  isLoading: boolean;
  formattedDate: string;
  officeName: string;
  scopeName: string;
  status: string;
  nominationsOpen?: boolean;
  candidatesCount: number;
};


const UserRoundGroup = ({ className }: { className?: string }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg"
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={cn("lucide lucide-user-round-group preview-icon", className)}
    >
      <path d="M17 21a5 5 0 00-10 0" /><path d="M22 10.5a3.5 3.5 0 00-5.507-2.868" /><path d="M7.507 7.632A3.5 3.5 0 002 10.5" /><circle cx="12" cy="13" r="3" /><circle cx="18.5" cy="4.5" r="2.5" /><circle cx="5.5" cy="4.5" r="2.5" />
    </svg>
  )
}

/**
 * Meta & Stats Overview Grid for an individual contested election instance.
 */
export function ElectionMetaStatsGrid({
  isLoading,
  formattedDate,
  officeName,
  scopeName,
  status,
  candidatesCount,
}: ElectionMetaStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Election day */}
      <div className="rounded-2xl bg-sidebar-softer/80 p-5 flex flex-col justify-between min-h-35">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-c-80">Election day</span>
          <Calendar className="size-4.5 text-c-60" />
        </div>
        <div className="text-[26px] font-bold text-c-90 tracking-tight">
          {isLoading ? <span className="text-c-40 text-sm font-normal">Loading...</span> : formattedDate}
        </div>
        <div className="text-xs text-c-50">Voting day schedule</div>
      </div>

      {/* 2. Office & Scope */}
      <div className="rounded-2xl bg-sidebar-softer/80 p-5 flex flex-col justify-between min-h-35">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-c-80">Office & Scope</span>
          <Layers className="size-4.5 text-c-60" />
        </div>
        <div className="text-[26px] font-bold text-c-90 tracking-tight truncate">
          {isLoading ? <span className="text-c-40 text-sm font-normal">Loading...</span> : officeName}
        </div>
        <div className="text-xs text-c-50 capitalize">{scopeName || "Nationwide"}</div>
      </div>

      {/* 3. Fielded Candidates */}
      <div className="rounded-2xl bg-sidebar-softer/80 p-5 flex flex-col justify-between min-h-35">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-c-80">Fielded Candidates</span>
          <UserRoundGroup className="size-4.5 text-c-60" />
        </div>
        <div className="text-[26px] font-bold text-c-90 tracking-tight">
          {isLoading ? (
            <span className="text-c-40 text-sm font-normal">Loading...</span>
          ) : (
            `${candidatesCount} in race`
          )}
        </div>
        <div className="text-xs text-c-50">Parties Contesting</div>
      </div>

      {/* 4. Status */}
      <div className="rounded-2xl bg-sidebar-softer/80 p-5 flex flex-col justify-between min-h-35">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-c-80">Status</span>
          <Calendar className="size-4.5 text-c-60" />
        </div>
        <div className="flex items-center">
          <span
            className={cn(
              "px-3 py-0.5 rounded-full text-xs font-semibold border-2 capitalize transition",
              status === "ongoing"
                ? "border-success/40 text-success bg-success/5"
                : status === "concluded"
                  ? "border-border text-c-50 bg-muted/20"
                  : "border-purple/50 text-purple bg-card",
            )}
          >
            {status || "Upcoming"}
          </span>
        </div>
        <div className="text-xs text-c-50">Voting day schedule</div>
      </div>
    </div>
  );
}

