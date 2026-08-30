import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { StateDropdown } from "../dropdowns/StateDropdown";

export type StateType = {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  latitude: number;
  longitude: number;
  lgas_count?: number;
  senatorial_districts_count?: number;
  federal_constituencies_count?: number;
  state_constituencies_count?: number;
  wards_count?: number;
  polling_units_count?: number;
};

export function StateTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">State</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-22.5 hidden md:block">
          LGAs
        </span>
        <span className="text-c-50 text-[14px] w-22.5 hidden md:block">
          Districts
        </span>
        <span className="text-c-50 text-[14px] w-22.5 hidden lg:block">
          Federal Con.
        </span>
        <span className="text-c-50 text-[14px] w-22.5 hidden lg:block">
          State Con.
        </span>
        <span className="text-c-50 text-[14px] w-22.5 hidden sm:block">
          Wards
        </span>
        <span className="text-c-50 text-[14px] w-22.5 text-center">PUs</span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function StateTableTile({ data }: { data: StateType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-22.5 hidden md:block">
          {data.lgas_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-22.5 hidden md:block">
          {data.senatorial_districts_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-22.5 hidden lg:block">
          {data.federal_constituencies_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-22.5 hidden lg:block">
          {data.state_constituencies_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-22.5 hidden sm:block">
          {data.wards_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-80 w-22.5 font-semibold">
          {data.polling_units_count ?? "-"}
        </span>
        <StateDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
