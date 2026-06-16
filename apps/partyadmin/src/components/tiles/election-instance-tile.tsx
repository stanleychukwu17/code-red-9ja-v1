import { Ellipsis, Folder, Star } from "lucide-react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { Avatar, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";

export type ElectionInstanceType = {
  _id: string;
  rank: number;
  rankColor: string;
  title: string;
  candidate: {
    _id: string;
    avatar?: string;
    name: string;
  };
  electionDate: string;
};

export function ElectionInstanceTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <p className="text-[16px] w-[70px]">Rank</p>
        <p className="truncate w-full text-[16px]">Election</p>
      </TileLeft>

      <TileRight>
        <p className="text-c-50 text-[14px] w-[200px] hidden xl:block">
          Candidates
        </p>

        <p className="text-c-50 text-[14px] shrink-0 md:mr-0 md:w-[100px]">
          Election date
        </p>
        <div className="text-c-50 text-[14px] ml-5 shrink-0 size-7" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionInstanceTableTile({
  data,
}: {
  data: ElectionInstanceType;
}) {
  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-3 w-[70px]">
          <Star
            className={cn(
              "size-4 shrink-0 fill-current",
              `text-[${data.rankColor}]`,
            )}
          />
          <p className="text-c-80 text-[16px]">{data.rank}</p>
        </div>

        <p className="truncate w-full text-[16px]">{data.title}</p>
      </TileLeft>

      <TileRight>
        <div className="hidden xl:flex items-center gap-2 w-[200px]">
          <Avatar className="size-6">
            <AvatarImage
              src={data.candidate.avatar}
              alt={data.candidate.name}
            />
          </Avatar>
          <p>{data.candidate.name}</p>
        </div>
        <p className="shrink-0 md:mr-0 md:w-[100px]">{data.electionDate}</p>

        <div className="ml-5 shrink-0 size-7 flex items-center justify-center text-c-50 hover:text-c-80 cursor-pointer">
          <Ellipsis className="size-5" />
        </div>
      </TileRight>
    </TileRow>
  );
}
