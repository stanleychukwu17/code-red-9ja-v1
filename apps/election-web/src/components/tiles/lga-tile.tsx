import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";


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
  polling_units_count?: number;
  wards_count?: number;
};

export function LgaTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">LGA</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-25 text-center">PUs</span>
        <span className="text-c-50 text-[14px] w-25 text-center">
          Wards
        </span>
        <span className="text-c-50 text-[14px] w-28.5 text-center">
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
        <span className="text-[15px] text-c-70 w-25 text-center">
          {data.polling_units_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-25 text-center">
          {data.wards_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-28.5 text-center">
          {data.state_name}
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileRow>
  );
}
