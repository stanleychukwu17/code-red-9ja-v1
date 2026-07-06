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
  state_id: number;
  state_name: string;
  senatorial_district_id: number;
  senatorial_district_name: string;
  polling_units_count?: number;
};

export function FederalConstituencyTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">Federal Constituency</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[100px] text-center">PUs</span>
        <span className="text-c-50 text-[14px] w-[150px] text-center hidden sm:block">
          District
        </span>
        <span className="text-c-50 text-[14px] w-[120px] text-center">
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
        <span className="text-[15px] text-c-70 w-[100px] text-center">
          {data.polling_units_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[150px] text-center hidden sm:block">
          {data.senatorial_district_name}
        </span>
        <span className="text-[15px] text-c-70 w-[120px] text-center">
          {data.state_name}
        </span>
        <FederalConstituencyDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
