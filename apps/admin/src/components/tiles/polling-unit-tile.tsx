import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type PollingUnitType = {
  title: string;
  meta: string[];
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
      </TileRight>
    </TileHeader>
  );
}

export function PollingUnitTableTile({ data }: { data: PollingUnitType }) {
  return (
    <TileRow>
      <TileLeft>
        <span className="text-[16px] text-c-80 font-semibold w-[140px] shrink-0">{data.title}</span>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.meta[0]}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[130px] text-center hidden md:block">{data.meta[1]}</span>
        <span className="text-[15px] text-c-70 w-[100px] text-center hidden sm:block">{data.meta[2]}</span>
        <span className="text-[15px] text-c-70 w-[110px] text-center">{data.meta[3]}</span>
      </TileRight>
    </TileRow>
  );
}
