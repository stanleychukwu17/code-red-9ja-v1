/**
 * @file Election Group Table Header & Tile Components
 * @description Provides row tile components and column headers for major election event groups
 * (e.g. "2023 General Elections", "2024 Edo Gubernatorial"). Displays party agent coverage percentages,
 * count of contained race ballots, party participation stats, and scheduled polling dates.
 */

import { Ellipsis } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import FancyFolderIcon from "@repo/ui/icons/fancy-folder-icon";
import { formatISODate } from "@repo/ui/lib/date";

export type ElectionGroupType = {
  id: number;
  fake_id?: number | bigint;
  name: string;
  polling_agents_coverage?: number | { percentage?: number };
  number_of_elections_party_is_contesting?: number;
  elections_count?: number;
  election_date: string;
};

/**
 * ElectionGroupTableHeader Component
 * Renders the table column labels for election groups.
 */
export function ElectionGroupTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90">Group</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-35 hidden xl:block">
          Agents coverage
        </span>
        <span className="text-c-50 text-[14px] w-25 hidden lg:block">
          Elections
        </span>
        <span className="text-c-50 text-[14px] w-28.5 hidden xl:block">
          Contesting in
        </span>
        <span className="text-c-50 text-[14px] w-27.5 hidden sm:block">
          Date
        </span>
        <div className="ml-2 shrink-0 size-7 flex items-center justify-center text-c-50 hover:text-c-80 cursor-pointer" />
      </TileRight>
    </TileHeader>
  );
}

/**
 * ElectionGroupTableTile Component
 * List row component rendering an individual election event group.
 */
export function ElectionGroupTableTile({ data }: { data: ElectionGroupType }) {
  const params = useParams({ strict: false }) as { partyShortName?: string };
  const partyShortName = params.partyShortName || "";
  const dateLabel = data.election_date ? formatISODate(data.election_date) : "—";
  const coveragePercentage = typeof data.polling_agents_coverage === "number"
    ? data.polling_agents_coverage
    : (data.polling_agents_coverage?.percentage ?? 0);

  return (
    <TileRow>
      <TileLeft>
        <FancyFolderIcon />
        <Link
          to="/$partyShortName/elections/instances"
          params={{ partyShortName }}
          search={{ election_group_id: data.id }}
          className="truncate w-full text-[16px] text-c-90 hover:text-primary hover:underline transition-colors"
        >
          {data.name ?? "—"}
        </Link>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-35 hidden xl:block">
          {coveragePercentage}%
        </span>
        <span className="text-[15px] text-c-70 w-25 hidden lg:block">
          {data.elections_count ?? 0}
        </span>
        <span className="text-[15px] text-c-70 w-28.5 hidden xl:block">
          {data.number_of_elections_party_is_contesting ?? 0}
        </span>
        <span className="text-[15px] text-c-70 w-27.5 hidden sm:block">
          {dateLabel}
        </span>
        <div className="ml-2 shrink-0 size-7 flex items-center justify-center text-c-50 hover:text-c-80 cursor-pointer">
          <Ellipsis className="size-5" />
        </div>
      </TileRight>
    </TileRow>
  );
}
