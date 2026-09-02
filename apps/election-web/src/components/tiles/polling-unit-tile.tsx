import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";


export type PollingUnitType = {
  id: number;
  name: string;
  code?: string | null;
  pu_code?: string | null;
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
        <span className="font-semibold text-c-80 w-35 shrink-0">
          PU Code
        </span>
        <span className="font-semibold text-c-80">Polling units</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-32.5 text-center hidden md:block">
          Ward
        </span>
        <span className="text-c-50 text-[14px] w-25 text-center hidden sm:block">
          LGA
        </span>
        <span className="text-c-50 text-[14px] w-27.5 text-center">
          State
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function PollingUnitTableTile({ data }: { data: PollingUnitType }) {
  const puCode = data.pu_code || data.code || "-";
  return (
    <TileRow>
      <TileLeft>
        <span className="text-[16px] text-c-80 font-semibold w-35 shrink-0">
          {puCode}
        </span>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-32.5 text-center hidden md:block">
          {data.ward_name}
        </span>
        <span className="text-[15px] text-c-70 w-25 text-center hidden sm:block">
          {data.lga_name}
        </span>
        <span className="text-[15px] text-c-70 w-27.5 text-center">
          {data.state_name}
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileRow>
  );
}
