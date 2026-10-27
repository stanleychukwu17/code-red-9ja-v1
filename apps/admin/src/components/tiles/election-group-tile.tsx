import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import FancyFolderIcon from "@repo/ui/icons/fancy-folder-icon";
import { formatISODate } from "@repo/ui/lib/date";
import { ElectionGroupDropdown } from "../dropdowns/ElectionGroupDropdown";
import { Link } from "@tanstack/react-router";

export type ElectionGroupType = {
  id: number;
  name: string;
  election_date?: string;
  active?: boolean;
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
        <span className="text-c-50 text-[14px] w-24 hidden sm:block">
          Status
        </span>
        <span className="text-c-50 text-[14px] w-28 hidden sm:block">
          Date
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionGroupTableTile({ data }: { data: ElectionGroupType }) {
  const isActive = data.active !== false;
  const displayDate = data.election_date
    ? formatISODate(data.election_date)
    : "—";

  return (
    <TileRow>
      <TileLeft>
        <FancyFolderIcon />
        <Link
          to="/elections/instances"
          search={{ election_group_id: data.id }}
          className="truncate w-full text-[16px] text-c-90 hover:text-primary hover:underline transition-colors"
        >
          {data.name ?? "—"}
        </Link>
      </TileLeft>
      <TileRight>
        <div className="w-24 hidden sm:flex items-center">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium ${
              isActive
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-c-20 text-c-50"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <span className="text-[15px] text-c-70 w-28 hidden sm:block truncate">
          {displayDate}
        </span>
        <ElectionGroupDropdown data={data} className="ml-2 hidden md:block" />
      </TileRight>
    </TileRow>
  );
}
