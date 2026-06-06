import { Folder, Ellipsis } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type ElectionGroupType = {
  title: string;
  badge?: string;
  meta: string[];
  rankIcon?: "folder" | "star";
};

export function ElectionGroupTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">Group</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[110px] hidden md:block">
          Status
        </span>
        <span className="text-c-50 text-[14px] w-[110px] hidden lg:block">
          Elections
        </span>
        <span className="text-c-50 text-[14px] w-[110px] hidden lg:block">
          States
        </span>
        <span className="text-c-50 text-[14px] w-[110px] hidden sm:block">
          Holds
        </span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionGroupTableTile({ data }: { data: ElectionGroupType }) {
  return (
    <TileRow>
      <TileLeft>
        <Folder className="size-5 shrink-0 fill-[#ffbf2e] text-[#ffbf2e]" />
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
              idx === 1 && "hidden lg:block",
              idx === 2 && "hidden sm:block",
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
