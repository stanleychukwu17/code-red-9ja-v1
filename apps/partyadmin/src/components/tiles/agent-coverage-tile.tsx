/**
 * @file Agent Coverage Table Tiles & Headers
 * @description Provides row tile components and table headers for agent coverage breakdowns across
 * geopolitical tiers (States, Senatorial Districts, Federal Constituencies, LGAs, Wards, Polling Units).
 * Displays staffing fill rates, readiness color meters, supervisor avatars, and direct assignment action triggers.
 */

import {
  AppAvatar,
} from "@repo/ui/components/avatar";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { MoreHorizontal, Plus } from "lucide-react";
import type * as React from "react";
import type { AgentCoverageUnitItem } from "#/lib/server/agent-coverage";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns color classes based on overall coverage readiness:
 * - 0%: Red (urgent gap)
 * - < 50%: Amber (partial coverage)
 * - >= 50%: Neutral/theme (healthy coverage)
 */
function getReadinessColor(pct?: number) {
  if (pct === undefined || pct === null) return "text-c-80";
  if (pct === 0) return "text-[#EF4444] font-bold";
  if (pct < 50) return "text-[#F59E0B] font-bold";
  return "text-neutral-900 dark:text-neutral-100 font-bold";
}

/**
 * Formats string numbers with percentages, bolding the primary count and muting the percentage
 */
function FormattedNumberWithPct({ value }: { value?: string }) {
  if (!value) return <span>—</span>;
  const match = value.match(/^([0-9,]+)\s*(\([0-9.]+%\))$/);
  if (match) {
    return (
      <span>
        <span className="font-bold text-neutral-900 dark:text-neutral-100">{match[1]}</span>{" "}
        <span className="text-c-50 font-normal">{match[2]}</span>
      </span>
    );
  }
  return <span className="font-bold text-neutral-900 dark:text-neutral-100">{value}</span>;
}

/**
 * AgentCoverageTableHeader Component
 * Renders the header row for electoral unit tiers (State through Ward level).
 */
export function AgentCoverageTableHeader({
  unitTitle = "States",
  unitType = "states",
  supervisorTitle = "State Supervisor",
}: {
  unitTitle?: string;
  unitType?: string;
  supervisorTitle?: string;
}) {
  const isState = unitType === "states";
  const hasLGASupervisor =
    unitType === "states" ||
    unitType === "senatorial_districts" ||
    unitType === "federal_constituencies" ||
    unitType === "lgas";

  return (
    <TileHeader>
      <TileLeft className="min-w-45">
        <span className="text-c-90 font-bold text-[14px]">{unitTitle}</span>
      </TileLeft>
      <TileRight className="text-sm text-c-50 font-medium">
        <span className="w-[130px] text-left">Polling Agents</span>
        <span className="w-[130px] text-left">Ward Supervisor</span>
        {hasLGASupervisor && (
          <span className="w-[130px] text-left">LGA Supervisor</span>
        )}
        {isState && (
          <span className="w-[130px] text-left">State Supervisor</span>
        )}
        <span className="w-35 text-left">Overall Readiness</span>
        <span className="w-35 text-left">{supervisorTitle}</span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

/**
 * AgentCoverageTableTile Component
 * Higher-level row tile representing an electoral unit (State, Senatorial District, Fed Constituency, LGA, Ward).
 * Displays staffing progress across tiers, overall readiness percentage, and supervisor avatar stack.
 */
export function AgentCoverageTableTile({
  data,
  unitType = "states",
  onClick,
  onAssign,
}: {
  data: AgentCoverageUnitItem;
  unitType?: string;
  onClick?: () => void;
  onAssign?: (item: AgentCoverageUnitItem) => void;
}) {
  const isState = unitType === "states";
  const hasLGASupervisor =
    unitType === "states" ||
    unitType === "senatorial_districts" ||
    unitType === "federal_constituencies" ||
    unitType === "lgas";

  const supervisors = Array.isArray(data.supervisors) ? data.supervisors : [];

  return (
    <TileRow onClick={onClick}>
      <TileLeft className="min-w-45">
        <span className="text-[14px] text-c-80 truncate">{data.name}</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[13.5px]">
        {/* Polling Agents */}
        <div className="w-[130px] text-left">
          <FormattedNumberWithPct value={data.polling_agents} />
        </div>

        {/* Ward Supervisor */}
        <div className="w-[130px] text-left">
          <FormattedNumberWithPct value={data.ward_supervisors} />
        </div>

        {/* LGA Supervisor */}
        {hasLGASupervisor && (
          <div className="w-[130px] text-left">
            <FormattedNumberWithPct value={data.lga_supervisors} />
          </div>
        )}

        {/* State Supervisor */}
        {isState && (
          <div className="w-[130px] text-left">
            <FormattedNumberWithPct value={data.state_supervisors} />
          </div>
        )}

        {/* Overall Readiness */}
        <div className="flex items-center gap-2 w-35">
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
          <span className={getReadinessColor(data.overall_readiness)}>
            {data.overall_readiness ?? 0}%
          </span>
        </div>

        {/* Supervisor Avatars + Add Button */}
        <div className="w-35 flex items-center gap-1.5">
          {supervisors.slice(0, 3).map((s, idx) => (
            <AppAvatar
              key={`${s.id}-${idx}`}
              src={s.avatar}
              alt={s.name}
              fallbackText={s.name?.slice(0, 2).toUpperCase()}
              className="size-8 ring-2 ring-white dark:ring-neutral-900 shrink-0"
            />
          ))}
          {supervisors.length < 2 && (
            <button
              type="button"
              aria-label="Assign supervisor"
              onClick={(e) => {
                e.stopPropagation();
                onAssign?.(data);
              }}
              className="size-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors shrink-0"
            >
              <Plus className="size-4" />
            </button>
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

/**
 * PollingUnitAgentCoverageTableHeader Component
 * Table header for the terminal polling unit coverage view.
 */
export function PollingUnitAgentCoverageTableHeader() {
  return (
    <TileHeader>
      <TileLeft className="min-w-45">
        <span className="text-c-90 font-bold text-[14px]">Polling units</span>
      </TileLeft>
      <TileRight className="text-sm text-c-50 font-medium">
        <span className="w-[130px] text-left">Polling Agents</span>
        <span className="w-35 text-left">Overall Readiness</span>
        <span className="w-35 text-left">PU Agents</span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

/**
 * PollingUnitAgentCoverageTableTile Component
 * Terminal row tile representing a single polling unit and its assigned agents.
 */
export function PollingUnitAgentCoverageTableTile({
  data,
  onAssign,
}: {
  data: AgentCoverageUnitItem;
  onAssign?: (item: AgentCoverageUnitItem) => void;
}) {
  const agents = Array.isArray(data.pu_agents || data.supervisors)
    ? (data.pu_agents || data.supervisors)!
    : [];

  return (
    <TileRow>
      <TileLeft className="min-w-45">
        <span className="text-[14px] text-c-80 truncate">{data.name}</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[13.5px]">
        {/* Polling Agents Count */}
        <div className="w-[130px] text-left">
          <span className="font-bold text-neutral-900 dark:text-neutral-100">
            {data.polling_agents ?? 0}
          </span>
        </div>

        {/* Overall Readiness */}
        <div className="flex items-center gap-2 w-35">
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
          <span className={getReadinessColor(data.overall_readiness)}>
            {data.overall_readiness ?? 0}%
          </span>
        </div>

        {/* PU Agents Avatars + Add Button */}
        <div className="w-35 flex items-center gap-1.5">
          {agents.slice(0, 3).map((a, idx) => (
            <AppAvatar
              key={`${a.id}-${idx}`}
              src={a.avatar}
              alt={a.name}
              fallbackText={a.name?.slice(0, 2).toUpperCase()}
              className="size-8 ring-2 ring-white dark:ring-neutral-900 shrink-0"
            />
          ))}
          {agents.length < 2 && (
            <button
              type="button"
              aria-label="Assign PU Agent"
              onClick={(e) => {
                e.stopPropagation();
                onAssign?.(data);
              }}
              className="size-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors shrink-0"
            >
              <Plus className="size-4" />
            </button>
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
