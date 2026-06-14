import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { PartyDropdown } from "../dropdowns/PartyDropdown";

export type PartyType = {
  id: number;
  short_name: string;
  name: string;
  logo: string;
  puAgents?: string;
};

export function PartyTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-[180px] shrink-0">Party</span>
        <span className="text-c-90">Name</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[140px] text-right hidden sm:block">
          PU agents
        </span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function PartyTableTile({ data }: { data: PartyType }) {
  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-10 w-[180px] shrink-0">
          <img
            src={
              data.logo ||
              "https://pub-632c6da9cf354d89aafad6f7291e8a29.r2.dev/uploads/placeholder.png"
            }
            alt={data.short_name}
            className="size-8 rounded-full object-cover shrink-0 bg-[#f2f2f2] border border-[#dfdfdf]"
          />
          <span className="text-c-90">{data.short_name}</span>
        </div>
        <p className="truncate w-full text-c-90">{data.name}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[140px] text-right hidden sm:block">
          {data.puAgents || "0 (0%)"}
        </span>
        <PartyDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
