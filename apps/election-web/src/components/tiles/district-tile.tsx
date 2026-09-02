import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type DistrictType = {
  title: string;
  meta: string[];
};

export function DistrictTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">Districts</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-28.5 text-center">PUs</span>
        <span className="text-c-50 text-[14px] w-28.5 text-center">State</span>
      </TileRight>
    </TileHeader>
  );
}

export function DistrictTableTile({ data }: { data: DistrictType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.title}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-28.5 text-center">{data.meta[0]}</span>
        <span className="text-[15px] text-c-70 w-28.5 text-center">{data.meta[1]}</span>
      </TileRight>
    </TileRow>
  );
}
