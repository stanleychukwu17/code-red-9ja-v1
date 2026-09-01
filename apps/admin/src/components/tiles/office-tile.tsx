import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import StarIcon from "@repo/ui/icons/star-icon";
import { getRankColor } from "@repo/ui/lib/rank-color";
import { cn } from "@repo/ui/lib/utils";
import { OfficeDropdown } from "../dropdowns/OfficeDropdown";

export type OfficeType = {
  id: number;
  name: string;
  election: string;
  scope: string;
  rank: number;
  instances_count: number;
  inec_election_type_id?: string;
  created_at?: string;
  updated_at?: string;
};

export function OfficeTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-[80px] shrink-0">Rank</span>
        <span className="text-c-90">Office</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[180px] hidden md:block">
          Election
        </span>
        <span className="text-c-50 text-[14px] w-[140px] hidden sm:block">
          Scope
        </span>
        <span className="text-c-50 text-[14px] w-[160px] hidden lg:block">
          INEC Type ID
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function OfficeTableTile({ data }: { data: OfficeType }) {
  const rank = String(data.rank);
  const target = data.scope;
  const election = data.election;

  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-4 w-[80px] shrink-0">
          <StarIcon
            className={cn("size-4 shrink-0 fill-current", getRankColor(rank))}
          />
          <span className="text-[16px] text-c-90">{rank}</span>
        </div>
        <p className="truncate w-full text-[16px] text-c-90">{data.name}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[180px] hidden md:block truncate">
          {election}
        </span>
        <span className="text-[15px] text-c-70 w-[140px] hidden sm:block truncate">
          {target}
        </span>
        <span className="text-[14px] text-c-50 font-mono w-[160px] hidden lg:block truncate">
          {data.inec_election_type_id || "-"}
        </span>
        <OfficeDropdown data={data} className="ml-2 hidden md:block" />
      </TileRight>
    </TileRow>
  );
}
