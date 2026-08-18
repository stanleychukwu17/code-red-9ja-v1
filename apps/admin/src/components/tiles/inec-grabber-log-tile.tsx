import * as React from "react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { getLocalTime } from "@repo/ui/lib/date";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";

export type INECResultGrabberLogType = {
  id: number;
  inec_result_grabber_id: number;
  election_group_id: number;
  election_id: number;
  election_name?: string;
  results_collected_count: number;
  status: string;
  error_message?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
};

export function INECGrabberLogTableHeader() {
  return (
    <TileHeader>
      <TileLeft className="!grow-0 w-[300px] sm:w-[400px]">
        <span className="text-c-50 text-[14px] w-[90px] shrink-0">
          Start time
        </span>
        <span className="text-c-50 text-[14px] w-[90px] shrink-0">
          End time
        </span>
        <span className="text-c-90 text-[14px]">Election</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[160px]">
          New results collected
        </span>
        <span className="text-c-50 text-[14px] w-[100px] hidden sm:block">
          Duration
        </span>
        <div className="w-8 shrink-0 ml-2" />
      </TileRight>
    </TileHeader>
  );
}

export function INECGrabberLogTableTile({
  data,
}: {
  data: INECResultGrabberLogType;
}) {
  const startTime = data.started_at
    ? getLocalTime(data.started_at, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";
  const endTime = data.ended_at
    ? getLocalTime(data.ended_at, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  const electionName = data.election_name || "Presidential Election";
  const countText = `+${(data.results_collected_count ?? 0).toLocaleString()}`;

  let durationText = "—";
  if (data.started_at && data.ended_at) {
    const startMs = new Date(data.started_at).getTime();
    const endMs = new Date(data.ended_at).getTime();
    const diffMins = Math.round((endMs - startMs) / (1000 * 60));
    durationText = diffMins > 0 ? `${diffMins} min` : "< 1 min";
  }

  return (
    <TileRow>
      <TileLeft>
        <span className="text-[15px] text-c-60 w-[90px] shrink-0">
          {startTime}
        </span>
        <span className="text-[15px] text-c-60 w-[90px] shrink-0">
          {endTime}
        </span>
        <p className="truncate text-[16px] text-c-80">{electionName}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] font-medium text-primary w-[160px]">
          {countText}
        </span>
        <span className="text-[15px] text-c-70 w-[100px] hidden sm:block">
          {durationText}
        </span>
        <div className="w-8 shrink-0 ml-2 flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-black/5 text-c-50 cursor-pointer outline-hidden">
              <MoreHorizontal className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="cursor-pointer">
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TileRight>
    </TileRow>
  );
}
