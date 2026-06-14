import { Ellipsis, Folder } from "lucide-react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type ElectionGroupType = {
  title: string;
  pollingAgentsCoverage: string;
  numberOfElectionsPartyIsContesting: string;
  statesCount: number;
  electionDate: string;
};

export function ElectionGroupTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <p className="truncate w-full text-[16px]">Group</p>
      </TileLeft>

      <TileRight>
        <p className="text-c-50 text-[14px] w-[140px] hidden xl:block">
          Agents coverage
        </p>
        <p className="text-c-50 text-[14px] w-[140px] hidden xl:block">
          Elections contesting
        </p>
        <p className="text-c-50 text-[14px] w-[140px] hidden xl:block">
          States
        </p>

        <p className="text-c-50 text-[14px] shrink-0 md:mr-0 md:w-[100px]">
          Election date
        </p>
        <div className="text-c-50 text-[14px] ml-5 shrink-0 size-7" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionGroupTableTile({ data }: { data: ElectionGroupType }) {
  return (
    <TileRow>
      <TileLeft>
        <Folder className="size-5 shrink-0 fill-[#ffbf2e] text-[#ffbf2e]" />
        {/* <Star
          className={cn(
            "size-5 shrink-0 fill-current",
            row.rankIconColor ?? "text-[#0dcf79]",
          )}
        /> */}
        <p className="truncate w-full text-[16px]">{data.title}</p>
      </TileLeft>

      <TileRight>
        <p className="w-[140px] hidden xl:block">
          {data.pollingAgentsCoverage}
        </p>
        <p className="w-[140px] hidden xl:block">
          {data.numberOfElectionsPartyIsContesting}
        </p>
        <p className="w-[140px] hidden xl:block">{data.statesCount}</p>
        <p className="shrink-0 md:mr-0 md:w-[100px]">{data.electionDate}</p>

        <div className="ml-5 shrink-0 size-7 flex items-center justify-center text-c-50 hover:text-c-80 cursor-pointer">
          <Ellipsis className="size-5" />
        </div>
      </TileRight>
    </TileRow>
  );
}
