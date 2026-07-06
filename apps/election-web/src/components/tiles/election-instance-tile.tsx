import { cn } from "@repo/ui/lib/utils";
import { getRankColor } from "@repo/ui/lib/rank-color";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { formatISODate } from "@repo/ui/lib/date";
import StarIcon from "@repo/ui/icons/star-icon";


export type ElectionInstanceType = {
  id: number;
  name: string;
  rank: number;
  candidates_count: number;
  election_date: string;
  election_group_id: number;
  election_group_name: string;
  office_id: number;
  office_name: string;
  scope: string;
  state_id?: number | null;
  senatorial_district_id?: number | null;
  federal_constituency_id?: number | null;
  state_constituency_id?: number | null;
  lga_id?: number | null;
  ward_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

export function ElectionInstanceTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-[80px] shrink-0">Rank</span>
        <span className="text-c-90">Election</span>
      </TileLeft>
      <TileRight>
        <div className="w-[110px] hidden md:block" />{" "}
        {/* Empty header spacer for status badge */}
        <span className="text-c-50 text-[14px] w-[110px] hidden lg:block">
          Candidates
        </span>
        <span className="text-c-50 text-[14px] w-[110px] hidden sm:block">
          Election date
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionInstanceTableTile({
  data,
}: {
  data: ElectionInstanceType;
}) {
  const dateLabel = data.election_date
    ? formatISODate(data.election_date)
    : "—";

  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-4 w-[80px] shrink-0">
          <StarIcon
            className={cn(
              "size-4 shrink-0 fill-current",
              getRankColor(data.rank),
            )}
          />
          <span className="text-[16px] text-c-90">{data.rank}</span>
        </div>
        <p className="truncate w-full text-[16px] text-c-80">{data.name}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[110px] hidden lg:block">
          {data.candidates_count ?? 0}
        </span>
        <span className="text-[15px] text-c-70 w-[110px] hidden sm:block">
          {dateLabel}
        </span>
        <ElectionInstanceDropdown
          data={data}
          className="ml-2 hidden md:block"
        />
      </TileRight>
    </TileRow>
  );
}
