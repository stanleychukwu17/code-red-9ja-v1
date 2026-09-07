import {
  AppAvatar,
  AvatarGroup,
  AvatarGroupCount,
} from "@repo/ui/components/avatar";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { cn } from "@repo/ui/lib/utils";
import { CheckCircle2, ChevronRight, MoreHorizontal } from "lucide-react";
import type * as React from "react";
import type { OperationsUnitItem } from "#/lib/server/election-operations";

// ─── Higher Level Operations Table Header (States -> Wards) ───────────────────
export function OperationsTableHeader({
  unitTitle = "States",
  supervisorTitle = "State Supervisors",
  isDrillable = true,
}: {
  unitTitle?: string;
  supervisorTitle?: string;
  isDrillable?: boolean;
}) {
  return (
    <TileHeader>
      <TileLeft className="min-w-[180px]">
        <span className="text-c-90 font-bold text-[14px]">{unitTitle}</span>
      </TileLeft>
      <TileRight className="text-sm">
        <span className="w-[120px] text-left">Agents at their PU</span>
        <span className="w-[150px] text-left">Avg Agent. arrival time</span>
        <span className="w-[120px] text-left">Election started in</span>
        <span className="w-[110px] text-left">Election ended in</span>
        <span className="w-[115px] text-left">Avg Ele. start time</span>
        <span className="w-[115px] text-left">Avg Ele. end time</span>
        <span className="w-[95px] text-left">Updates given</span>
        <span className="w-[90px] text-left">Reports given</span>
        <span className="w-[90px] text-left">Reported PUs</span>
        <span className="w-[105px] text-left">PUs with updates</span>
        <span className="w-[135px] text-left">Avg. update time interval</span>
        <span className="w-[155px] text-left">
          Live voters referred by agents
        </span>
        <span className="w-[110px] text-left">Results uploaded</span>
        <span className="w-[110px] text-left">Results expected</span>
        <span className="w-[110px] text-left">PUs w/ all results</span>
        <span className="w-[115px] text-left">PUs with 1 agent</span>
        <span className="w-[115px] text-left">Total agents</span>
        <span className="w-[85px] text-left">Total PUs</span>
        <span className="w-[110px] text-left">Overall Readiness</span>
        <span className="w-[140px] text-left">{supervisorTitle}</span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

// ─── Higher Level Operations Table Tile (States -> Wards) ─────────────────────
export function OperationsTableTile({
  data,
  onClick,
}: {
  data: OperationsUnitItem;
  onClick?: () => void;
}) {
  const isDrillable = !!onClick;
  const supervisors = Array.isArray(data.supervisors) ? data.supervisors : [];
  const displaySupervisors = supervisors.slice(0, 3);
  const remainingCount = supervisors.length - 3;

  return (
    <TileRow onClick={onClick}>
      <TileLeft className="min-w-[180px]">
        <span className="text-[14px] text-c-80 truncate">{data.name}</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[13.5px]">
        {/* Agents at their PU */}
        <span className="w-[120px] text-c-80 font-medium">
          {data.agents_at_pu || "—"}
        </span>

        {/* Avg Agent arrival time */}
        <span className="w-[150px] text-c-80 font-medium">
          {data.avg_agent_arrival_time || "—"}
        </span>

        {/* Election started in (amber) */}
        <span className="w-[120px] text-[#D97706] dark:text-amber-500 font-bold">
          {data.election_started_in || "—"}
        </span>

        {/* Election ended in */}
        <span className="w-[110px] text-c-80 font-medium">
          {data.election_ended_in || "—"}
        </span>

        {/* Avg Ele start time */}
        <span className="w-[115px] text-c-80 font-medium">
          {data.avg_ele_start_time || "—"}
        </span>

        {/* Avg Ele end time */}
        <span className="w-[115px] text-c-80 font-medium">
          {data.avg_ele_end_time || "—"}
        </span>

        {/* Updates given (blue) */}
        <span className="w-[95px] text-[#0099FF] dark:text-[#38BDF8] font-bold">
          {data.updates_given?.toLocaleString() ?? 0}
        </span>

        {/* Reports given (red) */}
        <span className="w-[90px] text-[#EF4444] font-bold">
          {data.reports_given?.toLocaleString() ?? 0}
        </span>

        {/* Reported PUs */}
        <span className="w-[90px] text-c-80">
          {data.reported_pus?.toLocaleString() ?? 0}
        </span>

        {/* PUs with updates */}
        <span className="w-[105px] text-c-80">
          {data.pus_with_updates?.toLocaleString() ?? 0}
        </span>

        {/* Avg update time interval */}
        <span className="w-[135px] text-c-80">
          {data.avg_update_time_interval || "—"}
        </span>

        {/* Live voters referred by agents */}
        <span className="w-[155px] text-c-80">
          {data.live_voters_referred?.toLocaleString() ?? 0}
        </span>

        {/* Results uploaded (green) */}
        <span className="w-[110px] text-[#10B981] dark:text-emerald-400 font-bold">
          {data.results_uploaded?.toLocaleString() ?? 0}
        </span>

        {/* Results expected */}
        <span className="w-[110px] text-c-80">
          {data.results_expected ?? 0}
        </span>

        {/* PUs w/ all results */}
        <span className="w-[110px] text-c-80">
          {data.pus_with_all_results?.toLocaleString() ?? 0}
        </span>

        {/* PUs with 1 agent (purple) */}
        <span className="w-[115px] text-[#9333EA] dark:text-purple-400 font-bold">
          {data.pus_with_1_agent || "—"}
        </span>

        {/* Total agents */}
        <span className="w-[115px] text-c-80">{data.total_agents || "—"}</span>

        {/* Total PUs */}
        <span className="w-[85px] text-c-80">
          {data.total_pus?.toLocaleString() ?? 0}
        </span>

        {/* Overall Readiness */}
        <span className="w-[110px] text-c-80 font-medium">
          {data.overall_readiness?.toLocaleString() ?? 0}
        </span>

        {/* Supervisors Avatars */}
        <div className="w-[140px] flex items-center">
          {supervisors.length === 0 ? (
            <span className="text-c-40 text-[12px] italic">Unassigned</span>
          ) : (
            <AvatarGroup className="-space-x-2">
              {displaySupervisors.map((s, idx) => (
                <AppAvatar
                  key={`${s.id}-${idx}`}
                  src={s.avatar}
                  alt={s.name}
                  fallbackText={s.name?.slice(0, 2).toUpperCase()}
                  className="size-7 ring-2 ring-white dark:ring-neutral-900 shrink-0"
                />
              ))}
              {remainingCount > 0 && (
                <AvatarGroupCount className="size-7 text-[11px] font-semibold bg-neutral-800 text-white ring-2 ring-white dark:ring-neutral-900">
                  +{remainingCount}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </div>

        {/* Action Menu button */}
        <button
          type="button"
          aria-label="More options"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="w-8 flex justify-center text-c-40 hover:text-c-80 transition-colors p-1 rounded"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </TileRight>
    </TileRow>
  );
}

// ─── Polling Unit Operations Table Header ─────────────────────────────────────
export function PollingUnitOperationsTableHeader() {
  return (
    <TileHeader className="min-w-max">
      <TileLeft className="min-w-[220px]">
        <span className="text-c-90 font-bold text-[14px]">Polling Unit</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[13px] text-c-50 font-medium">
        <span className="w-[120px] text-left">Agents at their PU</span>
        <span className="w-[135px] text-left">Avg Agent. arrival time</span>
        <span className="w-[120px] text-left">Avg Ele. start time</span>
        <span className="w-[120px] text-left">Avg Ele. end time</span>
        <span className="w-[95px] text-left">Updates given</span>
        <span className="w-[90px] text-left">Reports given</span>
        <span className="w-[140px] text-left">Avg. update time interval</span>
        <span className="w-[160px] text-left">
          Live voters referred by agents
        </span>
        <span className="w-[110px] text-left">Results uploaded</span>
        <span className="w-[110px] text-left">Results expected</span>
        <span className="w-[130px] text-left">Uploaded all results</span>
        <span className="w-[130px] text-left">PU Agents</span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

// ─── Polling Unit Operations Table Tile ───────────────────────────────────────
export function PollingUnitOperationsTableTile({
  data,
}: {
  data: OperationsUnitItem;
}) {
  const puAgents = Array.isArray(data.pu_agents) ? data.pu_agents : [];
  const displayAgents = puAgents.slice(0, 3);
  const remainingCount = puAgents.length - 3;
  const isComplete = Boolean(data.uploaded_all_results);

  return (
    <TileRow className="min-w-max py-3.5 px-4 items-center border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
      <TileLeft className="min-w-[220px] flex items-center gap-2">
        <span className="text-[14px] font-semibold text-c-90 truncate">
          {data.name}
        </span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[13.5px]">
        {/* Agents at PU (e.g. 2/3) */}
        <span className="w-[120px] text-c-80 font-medium">
          {data.agents_at_pu || "—"}
        </span>

        {/* Avg Agent arrival time */}
        <span className="w-[135px] text-c-80 font-medium">
          {data.avg_agent_arrival_time || "—"}
        </span>

        {/* Avg Ele start time */}
        <span className="w-[120px] text-c-80 font-medium">
          {data.avg_ele_start_time || "—"}
        </span>

        {/* Avg Ele end time */}
        <span className="w-[120px] text-c-80 font-medium">
          {data.avg_ele_end_time || "—"}
        </span>

        {/* Updates given (blue) */}
        <span className="w-[95px] text-[#0099FF] dark:text-[#38BDF8] font-bold">
          {data.updates_given?.toLocaleString() ?? 0}
        </span>

        {/* Reports given (red) */}
        <span className="w-[90px] text-[#EF4444] font-bold">
          {data.reports_given?.toLocaleString() ?? 0}
        </span>

        {/* Avg update time interval */}
        <span className="w-[140px] text-c-80">
          {data.avg_update_time_interval || "—"}
        </span>

        {/* Live voters referred */}
        <span className="w-[160px] text-c-80">
          {data.live_voters_referred?.toLocaleString() ?? 0}
        </span>

        {/* Results uploaded (green) */}
        <span className="w-[110px] text-[#10B981] dark:text-emerald-400 font-bold">
          {data.results_uploaded?.toLocaleString() ?? 0}
        </span>

        {/* Results expected */}
        <span className="w-[110px] text-c-80">
          {data.results_expected ?? 0}
        </span>

        {/* Uploaded all results indicator badge */}
        <div className="w-[130px] flex items-center">
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-[#10B981]">
              <CheckCircle2 className="size-4 shrink-0 fill-[#10B981] text-white" />
            </div>
          ) : (
            <div className="size-3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          )}
        </div>

        {/* PU Agents Avatars */}
        <div className="w-[130px] flex items-center">
          {puAgents.length === 0 ? (
            <span className="text-c-40 text-[12px] italic">No agents</span>
          ) : (
            <AvatarGroup className="-space-x-2">
              {displayAgents.map((a, idx) => (
                <AppAvatar
                  key={`${a.id}-${idx}`}
                  src={a.avatar}
                  alt={a.name}
                  fallbackText={a.name?.slice(0, 2).toUpperCase()}
                  className="size-7 ring-2 ring-white dark:ring-neutral-900 shrink-0"
                />
              ))}
              {remainingCount > 0 && (
                <AvatarGroupCount className="size-7 text-[11px] font-semibold bg-neutral-800 text-white ring-2 ring-white dark:ring-neutral-900">
                  +{remainingCount}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </div>

        {/* Action button */}
        <button
          type="button"
          aria-label="More options"
          onClick={(e) => e.stopPropagation()}
          className="w-8 flex justify-center text-c-40 hover:text-c-80 transition-colors p-1 rounded"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </TileRight>
    </TileRow>
  );
}
