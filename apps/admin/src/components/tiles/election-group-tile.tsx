import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import FancyFolderIcon from "@repo/ui/icons/fancy-folder-icon";
import { formatISODate } from "@repo/ui/lib/date";
import { ElectionGroupDropdown } from "../dropdowns/ElectionGroupDropdown";

export type ElectionGroupType = {
  id: number;
  name: string;
  year: number;
  created_at?: string;
  updated_at?: string;
};

export function ElectionGroupTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90">Group</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-27.5 hidden sm:block">
          Year
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionGroupTableTile({ data }: { data: ElectionGroupType }) {
  return (
    <TileRow>
      <TileLeft>
        <FancyFolderIcon />
        <p className="truncate w-full text-[16px] text-c-90">
          {data.name ?? "—"}
        </p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-27.5 hidden sm:block">
          {data.year ?? "—"}
        </span>
        <ElectionGroupDropdown data={data} className="ml-2 hidden md:block" />
      </TileRight>
    </TileRow>
  );
}
