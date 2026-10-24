/**
 * @file Election Instance Table Header & Tile Components
 * @description Renders row tiles for specific contested race ballots (e.g. Senatorial, Gubernatorial, House of Reps).
 * Displays race hierarchy rank, ballot name, candidate profile chip (or add candidate prompt),
 * polling date, and candidate assignment dropdown menu.
 */

import { cn } from "@repo/ui/lib/utils";
import { TileHeader, TileLeft, TileRight, TileRow } from "@repo/ui/components/tiles";
import { formatISODate } from "@repo/ui/lib/date";
import StarIcon from "@repo/ui/icons/star-icon";
import { AppAvatar, Avatar, AvatarImage } from "@repo/ui/components/avatar";
import { Link, useParams } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";
import { PartyElectionInstanceDropdown } from "../dropdowns/PartyElectionInstanceDropdown";

export type ElectionInstanceType = {
  id: number;
  fake_id?: number;
  rank?: number;
  name: string;
  candidate?: {
    id: string | number;
    avatar?: string;
    name: string;
  };
  running_mate?: {
    id: string | number;
    avatar?: string;
    name: string;
  };
  election_date: string;
  office_name?: string;
  scope?: string;
  election_group_id?: number;
};

const getPartyAdminRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "text-[#25654c]";
    case 2:
      return "text-[#ffbf2e]";
    case 3:
      return "text-[#0dcf79]";
    default:
      return "text-[#0dcf79]";
  }
};

/**
 * ElectionInstanceTableHeader Component
 * Renders table column labels for election race instances: Rank, Election, Candidates, Date.
 */
export function ElectionInstanceTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-20 shrink-0">Rank</span>
        <span className="text-c-90">Election</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-50 hidden lg:block">
          Candidates
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
 * ElectionInstanceTableTile Component
 * Renders an individual election race instance row displaying hierarchy ranking,
 * election title, candidate badge (or "Add candidate" placeholder), formatted date,
 * and contextual party election instance dropdown actions.
 */
export function ElectionInstanceTableTile({ data }: { data: ElectionInstanceType }) {
  const params = useParams({ strict: false }) as { partyShortName?: string };
  const partyShortName = params.partyShortName || "";
  // Format the ISO election date string or fallback to em-dash
  const dateLabel = data.election_date ? formatISODate(data.election_date) : "—";

  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-4 w-20 shrink-0">
          <StarIcon
            className={cn(
              "size-4 shrink-0 fill-current",
              getPartyAdminRankColor(data.rank || 3),
            )}
          />
          <span className="text-[16px] text-c-90">{data.rank ?? "—"}</span>
        </div>
        <Link
          to={APP_URL.partyRoutes.electionInstance(
            partyShortName,
            data.fake_id || data.id,
          ) as any}
          className="truncate w-full text-[16px] text-c-80 hover:text-c-100 hover:underline transition-colors"
        >
          {data.name}
        </Link>
      </TileLeft>
      <TileRight>
        {data.candidate ? (
          <div className="hidden lg:flex items-center gap-2 w-50">
            <AppAvatar
              src={data.candidate.avatar}
              alt={data.candidate.name}
              className="size-6 shrink-0"
            />
            <p className="truncate text-c-80 text-[15px]">
              {data.candidate.name}
            </p>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 w-50">
            <AppAvatar src={""} alt={""} className="size-6 shrink-0" />
            <p className="text-c-40 text-[15px] font-medium">Add candidate</p>
          </div>
        )}
        <span className="text-[15px] text-c-70 w-27.5 hidden sm:block">
          {dateLabel}
        </span>
        <PartyElectionInstanceDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
