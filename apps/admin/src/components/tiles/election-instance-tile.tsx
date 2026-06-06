import { Star, Ellipsis } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type ElectionInstanceType = {
  title: string;
  badge?: string;
  meta: string[];
  rank?: string;
  rankIcon?: "folder" | "star";
  rankIconColor?: string;
};

export function ElectionInstanceTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80 w-[60px] shrink-0">Rank</span>
        <span className="font-semibold text-c-80">Election</span>
      </TileLeft>
      <TileRight>
        <div className="w-[110px] hidden md:block" /> {/* Empty header spacer for status badge */}
        <span className="text-c-50 text-[14px] w-[110px] hidden lg:block">
          Candidates
        </span>
        <span className="text-c-50 text-[14px] w-[110px] hidden sm:block">
          Holds
        </span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionInstanceTableTile({
  data,
}: {
  data: ElectionInstanceType;
}) {
  const starColor = data.rankIconColor ?? "text-[#25654c]";

  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-2 w-[60px] shrink-0">
          <Star className={cn("size-5 shrink-0 fill-current", starColor)} />
          <span className="text-[16px] text-c-80 font-medium">{data.rank ?? "1"}</span>
        </div>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.title}
        </p>
      </TileLeft>
      <TileRight>
        {data.badge && (
          <div className="w-[110px] hidden md:block">
            <span className="rounded-full bg-[#e6e9ff] px-3 py-1 text-[13px] font-medium text-[#3846ff]">
              {data.badge}
            </span>
          </div>
        )}
        {data.meta.map((item, idx) => (
          <span
            key={idx}
            className={cn(
              "text-[15px] text-c-70 w-[110px]",
              idx === 0 && "hidden lg:block",
              idx === 1 && "hidden sm:block",
            )}
          >
            {item}
          </span>
        ))}
        <div className="w-8 shrink-0 flex justify-center text-c-50 hover:text-c-80 cursor-pointer">
          <Ellipsis className="size-5" />
        </div>
      </TileRight>
    </TileRow>
  );
}
