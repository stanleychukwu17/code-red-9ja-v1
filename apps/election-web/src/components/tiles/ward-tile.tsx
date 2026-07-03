import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";


export type WardType = {
  id: number;
  name: string;
  abbreviation: string;
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
        <span className="text-c-50 text-[14px] w-[80px] text-center">PUs</span>
        <span className="text-c-50 text-[14px] w-[130px] text-center hidden md:block">
          State Con.
        </span>
        <span className="text-c-50 text-[14px] w-[120px] text-center hidden sm:block">
          LGA
        </span>
        <span className="text-c-50 text-[14px] w-[100px] text-center">
          State
        </span>
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
        <span className="text-[15px] text-c-70 w-[80px] text-center">
          {data.polling_units_count ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[130px] text-center hidden md:block">
          {data.state_constituency_name ?? "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[120px] text-center hidden sm:block">
          {data.lga_name}
        </span>
        <span className="text-[15px] text-c-70 w-[100px] text-center">
          {data.state_name}
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileRow>
  );
}
