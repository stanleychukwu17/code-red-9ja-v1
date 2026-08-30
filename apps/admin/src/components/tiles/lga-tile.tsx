import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { LgaDropdown } from "../dropdowns/LgaDropdown";

export type LgaType = {
  id: number;
  name: string;
  abbreviation: string;
  state_id: number;
  state_name: string;
  senatorial_district_id: number;
  senatorial_district_name: string;
  federal_constituency_id: number;
  federal_constituency_name: string;
  state_constituencies_count?: number;
  wards_count?: number;
  polling_units_count?: number;
};

export function LgaTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">LGA</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-22.5 hidden lg:block">
          State Con.
        </span>
        <span className="text-c-50 text-[14px] w-22.5 hidden sm:block">
          Wards
        </span>
        <span className="text-c-50 text-[14px] w-22.5">PUs</span>
        <span className="text-c-50 text-[14px] w-28.5 hidden md:block">
          State
        </span>
        <div className="w-8 shrink-0 ml-2" />
      </TileRight>
    </TileHeader>
  );
}

export function LgaTableTile({ data }: { data: LgaType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-22.5 hidden lg:block">
          {data.state_constituencies_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-22.5 hidden sm:block">
          {data.wards_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-80 w-22.5 font-semibold">
          {data.polling_units_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-28.5 truncate hidden md:block">
          {data.state_name}
        </span>
        <LgaDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
