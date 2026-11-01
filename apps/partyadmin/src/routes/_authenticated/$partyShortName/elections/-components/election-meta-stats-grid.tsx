import { Calendar, Layers, Clock, Users } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";

export type ElectionMetaStatsGridProps = {
  isLoading: boolean;
  formattedDate: string;
  officeName: string;
  scopeName: string;
  status: string;
  nominationsOpen: boolean;
  candidatesCount: number;
};

/**
 * Meta & Stats Overview Grid for an individual contested election instance.
 */
export function ElectionMetaStatsGrid({
  isLoading,
  formattedDate,
  officeName,
  scopeName,
  status,
  nominationsOpen,
  candidatesCount,
}: ElectionMetaStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
          <span>Election Date</span>
          <Calendar className="size-4 text-c-40" />
        </div>
        <div className="text-xl font-semibold text-c-90">
          {isLoading ? <span className="text-c-40 text-sm">Loading...</span> : formattedDate}
        </div>
        <div className="text-xs text-c-50">Polling Day Schedule</div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
          <span>Scope & Office</span>
          <Layers className="size-4 text-c-40" />
        </div>
        <div className="text-xl font-semibold text-c-90 truncate">
          {isLoading ? <span className="text-c-40 text-sm">Loading...</span> : officeName}
        </div>
        <div className="text-xs text-c-50 capitalize">{scopeName || "Race Jurisdiction"}</div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
          <span>Status</span>
          <Clock className="size-4 text-c-40" />
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              status === "concluded"
                ? "muted"
                : status === "ongoing"
                  ? "success"
                  : "info"
            }
            className="capitalize px-2.5 py-1 text-xs"
          >
            {status}
          </Badge>
          {nominationsOpen && (
            <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              Nominations Open
            </Badge>
          )}
        </div>
        <div className="text-xs text-c-50">Official Contest State</div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
          <span>Fielded Candidates</span>
          <Users className="size-4 text-c-40" />
        </div>
        <div className="text-xl font-semibold text-c-90">
          {isLoading ? <span className="text-c-40 text-sm">Loading...</span> : candidatesCount}
        </div>
        <div className="text-xs text-c-50">Parties Contesting</div>
      </div>
    </div>
  );
}

