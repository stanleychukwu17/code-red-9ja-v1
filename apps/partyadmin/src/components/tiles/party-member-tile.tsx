import { Ellipsis } from "lucide-react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type PartyAdminType = {
  name: string;
  avatar: string;
  partyOffice: string;
  dateLabel: string;
  role?: string;
  office?: string;
};

export function PartyAdminTableHeader({ columns }: { columns: string[] }) {
  const [memberCol, roleCol, officeCol, dateCol] = columns;

  return (
    <TileHeader>
      <TileLeft>
        <p className="truncate w-full text-[16px]">{memberCol}</p>
      </TileLeft>

      <TileRight>
        <p className="text-c-50 text-[14px] w-35 hidden md:block">
          {roleCol}
        </p>
        <p className="text-c-50 text-[14px] w-[180px] hidden lg:block">
          {officeCol}
        </p>
        <p className="text-c-50 text-[14px] w-35 hidden sm:block">
          {dateCol}
        </p>
        <div className="ml-2 shrink-0 size-7" />
      </TileRight>
    </TileHeader>
  );
}

export function PartyAdminTableTile({ data }: { data: PartyAdminType }) {
  return (
    <TileRow>
      <TileLeft>
        <img
          src={data.avatar}
          alt={data.name}
          className="size-9 rounded-full object-cover shrink-0"
        />
        <p className="truncate w-full text-[16px] text-[#222]">{data.name}</p>
      </TileLeft>

      <TileRight>
        <p className="w-35 truncate hidden md:block text-[#ff9a3c] font-medium">
          {data.role || "-"}
        </p>
        <p className="w-[180px] truncate hidden lg:block text-[#313131]">
          {data.partyOffice}
        </p>
        <p className="w-35 hidden sm:block text-[#313131]">
          {data.dateLabel}
        </p>

        <div className="ml-2 shrink-0 size-7 flex items-center justify-center text-c-50 hover:text-c-80 cursor-pointer">
          <Ellipsis className="size-5" />
        </div>
      </TileRight>
    </TileRow>
  );
}
