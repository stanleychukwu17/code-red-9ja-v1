import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type PartyType = {
  code: string;
  name: string;
  logo: string;
  puAgents: string;
};

export function PartyTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-80 w-[100px] shrink-0">Party</span>
        <span className="text-c-80">Name</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[180px] text-right">
          PU agents
        </span>
      </TileRight>
    </TileHeader>
  );
}

export function PartyTableTile({ data }: { data: PartyType }) {
  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-4 w-[100px] shrink-0">
          <img
            src={data.logo}
            alt={data.code}
            className="size-7 rounded-full object-cover shrink-0"
          />
          <span className="text-[16px] text-c-80">{data.code}</span>
        </div>
        <p className="truncate w-full text-[16px] text-c-80">{data.name}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-[180px] text-right">
          {data.puAgents}
        </span>
      </TileRight>
    </TileRow>
  );
}
