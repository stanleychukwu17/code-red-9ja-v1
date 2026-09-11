import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";

export type PartyType = {
  id: number;
  short_name: string;
  name: string;
  logo: string;
  puAgents?: string;
  is_verified?: boolean;
};

export function PartyTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-45 shrink-0">Party</span>
        <span className="text-c-90">Name</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-35 text-right hidden sm:block">
          PU agents
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function PartyTableTile({ data }: { data: PartyType }) {
  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-10 w-45 shrink-0">
          <img
            src={
              data.logo ||
              "https://pub-632c6da9cf354d89aafad6f7291e8a29.r2.dev/uploads/placeholder.png"
            }
            alt={data.short_name}
            className="size-8 rounded-full object-cover shrink-0 bg-[#f2f2f2] border border-[#dfdfdf]"
          />
          <span className="text-c-90">{data.short_name}</span>
        </div>
        <div className="flex items-center gap-2 truncate w-full">
          <p className="truncate text-c-90">{data.name}</p>
          {data.is_verified && (
            <div className="flex items-center gap-1 shrink-0 relative -bottom-px">
              <VerificationBadge id={3} title="Verified Political Party" />
            </div>
          )}
        </div>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-35 text-right hidden sm:block">
          {data.puAgents || "0 (0%)"}
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileRow>
  );
}
