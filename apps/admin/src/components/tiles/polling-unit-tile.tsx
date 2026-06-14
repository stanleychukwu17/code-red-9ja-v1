import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { PollingUnitDropdown } from "../dropdowns/PollingUnitDropdown";

export type PollingUnitType = {
  id: number;
  name: string;
  abbreviation?: string | null;
  units?: string | null;
  delimitation?: string | null;
  remark?: string | null;
  registration_area_id?: number | null;
  ward_id: number;
  ward_name: string;
  lga_id: number;
  lga_name: string;
  state_id: number;
  state_name: string;
  latitude?: number | null;
  longitude?: number | null;
  precise_location?: string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
};

export function PollingUnitTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80 w-[140px] shrink-0">PU Code</span>
        <span className="font-semibold text-c-80">Polling units</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[130px] text-center hidden md:block">Ward</span>
        <span className="text-c-50 text-[14px] w-[100px] text-center hidden sm:block">LGA</span>
        <span className="text-c-50 text-[14px] w-[110px] text-center">State</span>
        <div className="w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function PollingUnitTableTile({ data }: { data: PollingUnitType }) {
  const puCode = data.delimitation || data.abbreviation || "-";
  return (
    <TileRow>
      <TileLeft>
        <span className="text-[16px] text-c-80 font-semibold w-[140px] shrink-0">{puCode}</span>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[130px] text-center hidden md:block">{data.ward_name}</span>
        <span className="text-[15px] text-c-70 w-[100px] text-center hidden sm:block">{data.lga_name}</span>
        <span className="text-[15px] text-c-70 w-[110px] text-center">{data.state_name}</span>
        <PollingUnitDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
