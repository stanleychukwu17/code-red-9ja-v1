import { Star, Ellipsis } from "lucide-react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type ElectionTypeType = {
  title: string;
  subtitle?: string;
  badge?: string;
  meta: string[];
  rankIcon?: "folder" | "star";
  rank?: string;
  target?: string;
  usage?: string;
};

export function ElectionTypeTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80 w-[60px] shrink-0">Rank</span>
        <span className="font-semibold text-c-80">Election</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[110px] hidden md:block">
          Usage
        </span>
        <span className="text-c-50 text-[14px] w-[110px] hidden sm:block">
          Target
        </span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionTypeTableTile({ data }: { data: ElectionTypeType }) {
  const rank = data.rank ?? (
    data.title === "Presidential" ? "1" :
    data.title === "Governorship" ? "2" :
    "3"
  );
  
  const target = data.target ?? (
    data.title === "Presidential" ? "Nationwide" :
    data.title === "Governorship" ? "State" :
    data.title === "Senatorial" ? "District" :
    data.title === "House of Representatives" ? "Constituency" :
    "Nationwide"
  );
  
  const usage = data.usage ?? data.meta[0] ?? "0";

  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-2 w-[60px] shrink-0">
          <Star className="size-5 shrink-0 fill-current text-[#25654c]" />
          <span className="text-[16px] text-c-80 font-medium">{rank}</span>
        </div>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.title}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[110px] hidden md:block">
          {usage}
        </span>
        <span className="text-[15px] text-c-70 w-[110px] hidden sm:block">
          {target}
        </span>
        <div className="w-8 shrink-0 flex justify-center text-c-50 hover:text-c-80 cursor-pointer">
          <Ellipsis className="size-5" />
        </div>
      </TileRight>
    </TileRow>
  );
}
