import { cn } from "@repo/ui/lib/utils";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { formatISODate } from "@repo/ui/lib/date";
import StarIcon from "@repo/ui/icons/star-icon";
import { AppAvatar, Avatar, AvatarImage } from "@repo/ui/components/avatar";
import { PartyElectionInstanceDropdown } from "../dropdowns/PartyElectionInstanceDropdown";

export type ElectionInstanceType = {
  id: number;
  rank: number;
  title: string;
  candidate?: {
    id: string | number;
    avatar?: string;
    name: string;
  };
  electionDate: string;
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

export function ElectionInstanceTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-[80px] shrink-0">Rank</span>
        <span className="text-c-90">Election</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[200px] hidden lg:block">
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

export function ElectionInstanceTableTile({
  data,
}: {
  data: ElectionInstanceType;
}) {
  const dateLabel = data.electionDate ? formatISODate(data.electionDate) : "—";

  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-4 w-[80px] shrink-0">
          <StarIcon
            className={cn(
              "size-4 shrink-0 fill-current",
              getPartyAdminRankColor(data.rank),
            )}
          />
          <span className="text-[16px] text-c-90">{data.rank}</span>
        </div>
        <p className="truncate w-full text-[16px] text-c-80">{data.title}</p>
      </TileLeft>
      <TileRight>
        {data.candidate ? (
          <div className="hidden lg:flex items-center gap-2 w-[200px]">
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
          <div className="hidden lg:flex items-center gap-2 w-[200px]">
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
