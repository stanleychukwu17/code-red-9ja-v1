import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type LgaType = {
  title: string;
  meta: string[];
};

export function LgaTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">LGA</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[100px] text-center">PUs</span>
        <span className="text-c-50 text-[14px] w-[100px] text-center">Wards</span>
        <span className="text-c-50 text-[14px] w-[120px] text-center">State</span>
      </TileRight>
    </TileHeader>
  );
}

export function LgaTableTile({ data }: { data: LgaType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.title}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[100px] text-center">{data.meta[0]}</span>
        <span className="text-[15px] text-c-70 w-[100px] text-center">{data.meta[1]}</span>
        <span className="text-[15px] text-c-70 w-[120px] text-center">{data.meta[2]}</span>
      </TileRight>
    </TileRow>
  );
}
