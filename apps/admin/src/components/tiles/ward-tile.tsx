import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type WardType = {
  title: string;
  meta: string[];
};

export function WardTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">Ward</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[80px] text-center">PUs</span>
        <span className="text-c-50 text-[14px] w-[130px] text-center hidden md:block">State Con.</span>
        <span className="text-c-50 text-[14px] w-[120px] text-center hidden sm:block">LGA</span>
        <span className="text-c-50 text-[14px] w-[100px] text-center">State</span>
      </TileRight>
    </TileHeader>
  );
}

export function WardTableTile({ data }: { data: WardType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.title}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[80px] text-center">{data.meta[0]}</span>
        <span className="text-[15px] text-c-70 w-[130px] text-center hidden md:block">{data.meta[1]}</span>
        <span className="text-[15px] text-c-70 w-[120px] text-center hidden sm:block">{data.meta[2]}</span>
        <span className="text-[15px] text-c-70 w-[100px] text-center">{data.meta[3]}</span>
      </TileRight>
    </TileRow>
  );
}
