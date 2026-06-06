import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type StateType = {
  title: string;
  meta: string[];
};

export function StateTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">State</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[90px] text-center hidden md:block">LGAs</span>
        <span className="text-c-50 text-[14px] w-[90px] text-center hidden md:block">Districts</span>
        <span className="text-c-50 text-[14px] w-[90px] text-center hidden lg:block">Federal Con.</span>
        <span className="text-c-50 text-[14px] w-[90px] text-center hidden lg:block">State Con.</span>
        <span className="text-c-50 text-[14px] w-[90px] text-center hidden sm:block">Wards</span>
        <span className="text-c-50 text-[14px] w-[90px] text-center">PUs</span>
      </TileRight>
    </TileHeader>
  );
}

export function StateTableTile({ data }: { data: StateType }) {
  return (
    <TileRow>
      <TileLeft>
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.title}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[90px] text-center hidden md:block">{data.meta[0]}</span>
        <span className="text-[15px] text-c-70 w-[90px] text-center hidden md:block">{data.meta[1]}</span>
        <span className="text-[15px] text-c-70 w-[90px] text-center hidden lg:block">{data.meta[2]}</span>
        <span className="text-[15px] text-c-70 w-[90px] text-center hidden lg:block">{data.meta[3]}</span>
        <span className="text-[15px] text-c-70 w-[90px] text-center hidden sm:block">{data.meta[4]}</span>
        <span className="text-[15px] text-c-80 w-[90px] text-center font-semibold">{data.meta[5]}</span>
      </TileRight>
    </TileRow>
  );
}
