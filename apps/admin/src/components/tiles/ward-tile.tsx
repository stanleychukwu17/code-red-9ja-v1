import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { WardDropdown } from "../dropdowns/WardDropdown";

export type WardType = {
  id: number;
  name: string;
  code: string;
  lga_id: number;
  lga_name: string;
  state_id: number;
  state_name: string;
  polling_units_count?: number;
  state_constituency_name?: string;
};

export function WardTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">Ward</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[120px]">PUs</span>
        <span className="text-c-50 text-[14px] w-[160px] hidden sm:block">
          LGA
        </span>
        <span className="text-c-50 text-[14px] w-[140px]">State</span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function WardTableTile({ data }: { data: WardType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[120px]">
          {data.polling_units_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[160px] hidden sm:block">
          {data.lga_name}
        </span>
        <span className="text-[15px] text-c-70 w-[140px]">
          {data.state_name}
        </span>
        <WardDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
