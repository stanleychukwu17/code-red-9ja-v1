import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type StateConstituencyType = {
  title: string;
  meta: string[];
};

export function StateConstituencyTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">State Constituency</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[100px] text-center">PUs</span>
        <span className="text-c-50 text-[14px] w-[150px] text-center hidden sm:block">District</span>
        <span className="text-c-50 text-[14px] w-[120px] text-center">State</span>
      </TileRight>
    </TileHeader>
  );
}

export function StateConstituencyTableTile({ data }: { data: StateConstituencyType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.title}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[100px] text-center">{data.meta[0]}</span>
        <span className="text-[15px] text-c-70 w-[150px] text-center hidden sm:block">{data.meta[1]}</span>
        <span className="text-[15px] text-c-70 w-[120px] text-center">{data.meta[2]}</span>
      </TileRight>
    </TileRow>
  );
}
