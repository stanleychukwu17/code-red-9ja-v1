import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { SenatorialDistrictDropdown } from "../dropdowns/SenatorialDistrictDropdown";

export type DistrictType = {
  id: number;
  name: string;
  code?: string;
  description: string;
  coalition_center: string;
  state_id: number;
  state_name: string;
  federal_constituencies_count?: number;
  lgas_count?: number;
  state_constituencies_count?: number;
  wards_count?: number;
  polling_units_count?: number;
};

export function DistrictTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">District</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[90px] hidden xl:block">
          LGAs
        </span>
        <span className="text-c-50 text-[14px] w-[90px] hidden lg:block">
          Fed. Con.
        </span>
        <span className="text-c-50 text-[14px] w-[90px] hidden lg:block">
          State Con.
        </span>
        <span className="text-c-50 text-[14px] w-[90px] hidden sm:block">
          Wards
        </span>
        <span className="text-c-50 text-[14px] w-[90px]">PUs</span>
        <span className="text-c-50 text-[14px] w-[120px] hidden md:block">
          State
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function DistrictTableTile({ data }: { data: DistrictType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[90px] hidden xl:block">
          {data.lgas_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[90px] hidden lg:block">
          {data.federal_constituencies_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[90px] hidden lg:block">
          {data.state_constituencies_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[90px] hidden sm:block">
          {data.wards_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-80 w-[90px] font-semibold">
          {data.polling_units_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[120px] truncate hidden md:block">
          {data.state_name}
        </span>
        <SenatorialDistrictDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
