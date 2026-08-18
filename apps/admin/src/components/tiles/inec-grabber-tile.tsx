import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { timeAgo } from "@repo/ui/lib/date";
import { INECGrabberDropdown } from "../dropdowns/INECGrabberDropdown";

export type INECResultGrabberType = {
  id: number;
  election_group_id: number;
  election_id: number;
  name?: string;
  election_name?: string;
  scope: string;
  election_date: string;
  lgas_with_complete_results_count: number;
  wards_with_complete_results_count: number;
  uploaded_results_count: number;
  total_polling_units?: number;
  sync_status: string;
  sync_error_message?: string;
  created_at: string;
  updated_at: string;
};

export function INECGrabberTableHeader() {
  return (
    <TileHeader>
      <TileLeft className="!grow-0 w-[240px] sm:w-[320px]">
        <span className="text-c-50 text-[14px] w-[90px] shrink-0">
          Last ran
        </span>
        <span className="text-c-80 text-[14px]">Election</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[140px]">
          Results collected
        </span>
        <span className="text-c-50 text-[14px] w-[100px] hidden sm:block">
          LGAs covered
        </span>
        <span className="text-c-50 text-[14px] w-[100px] hidden md:block">
          Wards covered
        </span>
        <div className="w-8 shrink-0 ml-2" />
      </TileRight>
    </TileHeader>
  );
}

export function INECGrabberTableTile({
  data,
}: {
  data: INECResultGrabberType;
}) {
  const lastRunText = data.updated_at ? `${timeAgo(data.updated_at)} ago` : "—";
  const electionName =
    data.election_name || data.name || "Presidential Election";
  const count = data.uploaded_results_count ?? 0;
  const total = data.total_polling_units ?? 0;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const resultsCountText =
    pct > 0 ? `${count.toLocaleString()} (${pct}%)` : count.toLocaleString();

  return (
    <TileRow>
      <TileLeft>
        <span className="text-[15px] text-c-60 w-[90px] shrink-0">
          {lastRunText}
        </span>
        <p className="truncate text-[16px] text-c-90">{electionName}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] font-medium text-primary w-[140px]">
          {resultsCountText}
        </span>
        <span className="text-[15px] text-c-70 w-[100px] hidden sm:block">
          {(data.lgas_with_complete_results_count ?? 0).toLocaleString()}
        </span>
        <span className="text-[15px] text-c-70 w-[100px] hidden md:block">
          {(data.wards_with_complete_results_count ?? 0).toLocaleString()}
        </span>
        <INECGrabberDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
