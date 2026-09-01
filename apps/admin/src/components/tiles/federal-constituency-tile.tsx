import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { FederalConstituencyDropdown } from "../dropdowns/FederalConstituencyDropdown";

export type FederalConstituencyType = {
  id: number;
  name: string;
  code?: string;
  state_id: number;
  state_name: string;
  senatorial_district_id: number;
  senatorial_district_name: string;
  lgas_count?: number;
  state_constituencies_count?: number;
  wards_count?: number;
  polling_units_count?: number;
};

export function FederalConstituencyTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">Federal Constituency</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-22.5 hidden xl:block">
          LGAs
        </span>
        <span className="text-c-50 text-[14px] w-22.5 hidden lg:block">
          State Con.
        </span>
        <span className="text-c-50 text-[14px] w-22.5 hidden sm:block">
          Wards
        </span>
        <span className="text-c-50 text-[14px] w-22.5">PUs</span>
        <span className="text-c-50 text-[14px] w-[150px] hidden xl:block">
          District
        </span>
        <span className="text-c-50 text-[14px] w-28.5 hidden md:block">
          State
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function FederalConstituencyTableTile({
  data,
}: {
  data: FederalConstituencyType;
}) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-22.5 hidden xl:block">
          {data.lgas_count ?? "-"}
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
        <span className="text-[15px] text-c-70 w-[150px] truncate hidden xl:block">
          {data.senatorial_district_name}
        </span>
        <span className="text-[15px] text-c-70 w-28.5 truncate hidden md:block">
          {data.state_name}
        </span>
        <FederalConstituencyDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
