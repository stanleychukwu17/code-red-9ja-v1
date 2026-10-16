import { cn } from "@repo/ui/lib/utils";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { formatISODate } from "@repo/ui/lib/date";
import { Checkbox } from "@repo/ui/components/checkbox";
import { ElectionInstanceDropdown } from "../dropdowns/ElectionInstanceDropdown";

export type ElectionInstanceType = {
  id: number;
  name: string;
  candidates_count?: number;
  election_date: string;
  election_group_id: number;
  election_group_name?: string;
  office_id: number;
  office_name?: string;
  scope: string;
  state_id?: number | null;
  senatorial_district_id?: number | null;
  federal_constituency_id?: number | null;
  state_constituency_id?: number | null;
  lga_id?: number | null;
  ward_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

export function ElectionInstanceTableHeader({
  selectedCount = 0,
  totalCount = 0,
  onToggleSelectAll,
}: {
  selectedCount?: number;
  totalCount?: number;
  onToggleSelectAll?: () => void;
}) {
  const isAll = totalCount > 0 && selectedCount === totalCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

  return (
    <TileHeader>
      <TileLeft>
        <div className="flex items-center gap-3 shrink-0">
          {onToggleSelectAll && (
            <Checkbox
              checked={isAll ? true : isIndeterminate ? "indeterminate" : false}
              onCheckedChange={onToggleSelectAll}
              aria-label="Select all elections"
            />
          )}
        </div>
        <span className="text-c-90">Election</span>
      </TileLeft>
      <TileRight>
        <div className="w-27.5 hidden md:block" />{" "}
        {/* Empty header spacer for status badge */}
        <span className="text-c-50 text-[14px] w-27.5 hidden lg:block">
          Candidates
        </span>
        <span className="text-c-50 text-[14px] w-27.5 hidden sm:block">
          Election date
        </span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function ElectionInstanceTableTile({
  data,
  isSelected = false,
  onToggleSelect,
}: {
  data: ElectionInstanceType;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
}) {
  const dateLabel = data.election_date
    ? formatISODate(data.election_date)
    : "—";

  return (
    <TileRow
      className={cn(
        "transition-colors",
        isSelected && "bg-primary/5 hover:bg-primary/10",
      )}
      onClick={() => onToggleSelect?.(data.id)}
    >
      <TileLeft>
        <div
          className="flex items-center gap-3 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {onToggleSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(data.id)}
              aria-label={`Select ${data.name}`}
            />
          )}
        </div>
        <p className="truncate w-full text-[16px] text-c-80">{data.name}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-70 w-27.5 hidden lg:block">
          {data.candidates_count ?? 0}
        </span>
        <span className="text-[15px] text-c-70 w-27.5 hidden sm:block">
          {dateLabel}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <ElectionInstanceDropdown
            data={data}
            className="ml-2 hidden md:block"
          />
        </div>
      </TileRight>
    </TileRow>
  );
}
