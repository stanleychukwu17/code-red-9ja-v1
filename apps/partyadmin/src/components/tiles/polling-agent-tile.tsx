import type { AgentPerformanceItem } from "#/lib/server/agents";
import { AppAvatar } from "@repo/ui/components/avatar";
import { AgentDropdown } from "../dropdowns/AgentDropdown";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export function StatusCheckIcon({ active }: { active?: boolean }) {
  if (active) {
    return (
      <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    );
  }
  return <div className="w-5 h-5 rounded-full bg-c-20 dark:bg-c-80 shrink-0" />;
}

export function PollingAgentTableHeader() {
  return (
    <TileHeader className="min-w-max">
      <TileLeft className="min-w-fit">
        <span className="text-c-50 text-[14px] min-w-[200px]">User</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4">
        <span className="text-c-50 text-[14px] w-[90px]">Readiness</span>
        <span className="text-c-50 text-[14px] w-[100px]">Arrived at</span>
        <span className="text-c-50 text-[14px] w-[120px]">
          Election started
        </span>
        <span className="text-c-50 text-[14px] w-[120px]">Election ended</span>
        <span className="text-c-50 text-[14px] w-[110px]">Updates Given</span>
        <span className="text-c-50 text-[14px] w-[110px]">Reports Given</span>
        <span className="text-c-50 text-[14px] w-[140px]">
          Live voters referred
        </span>
        <span className="text-c-50 text-[14px] w-[120px]">
          Results uploaded
        </span>
        <span className="text-c-50 text-[14px] w-[120px]">Earnings</span>
        <span className="text-c-50 text-[14px] w-[130px]">
          Completion Status
        </span>
        <span className="text-c-50 text-[14px] w-[130px]">
          Requested Payout
        </span>
        <span className="text-c-50 text-[14px] w-[80px]">Paid</span>
        <span className="text-c-50 text-[14px] w-[120px]">State</span>
        <span className="text-c-50 text-[14px] w-[130px]">LGA</span>
        <span className="text-c-50 text-[14px] w-[130px]">Ward</span>
        <span className="text-c-50 text-[14px] w-[180px]">Polling Unit</span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function PollingAgentTableTile({
  data,
  refetch,
}: {
  data: AgentPerformanceItem;
  refetch?: () => void;
}) {
  return (
    <TileRow className="min-w-max py-3 px-4">
      <TileLeft className="min-w-fit flex items-center gap-3 min-w-[200px]">
        <AppAvatar
          src={data.avatar_url}
          alt={data.user_name}
          className="size-10 shrink-0"
        />
        <span className="text-[16px] font-medium text-c-90 truncate">
          {data.user_name}
        </span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[14px]">
        <span className="w-[90px] font-medium">{data.readiness_pct ?? 0}%</span>
        <span className="w-[100px]">{data.arrived_at || "—"}</span>
        <span className="w-[120px] font-medium">
          {data.election_started_at || "—"}
        </span>
        <span className="w-[120px] font-medium">
          {data.election_ended_at || "—"}
        </span>
        <span className="w-[110px]">{data.updates_given ?? 0}</span>
        <span className="w-[110px]">{data.reports_given ?? 0}</span>
        <span className="w-[140px]">{data.live_voters_referred ?? 0}</span>
        <span className="w-[120px] font-bold">
          {data.results_uploaded || "—"}
        </span>
        <span className="w-[120px] font-bold text-c-100">
          {data.earnings_formatted || "₦0.00"}
        </span>
        <div className="w-[130px] flex justify-start">
          <StatusCheckIcon active={data.completion_status} />
        </div>
        <div className="w-[130px] flex justify-start">
          <StatusCheckIcon active={data.requested_payout} />
        </div>
        <div className="w-[80px] flex justify-start">
          <StatusCheckIcon active={data.paid} />
        </div>
        <span className="w-[120px] truncate">{data.state_name || "—"}</span>
        <span className="w-[130px] truncate">{data.lga_name || "—"}</span>
        <span className="w-[130px] truncate">{data.ward_name || "—"}</span>
        <span className="w-[180px] truncate">
          {data.polling_unit_name || data.polling_unit_code || "—"}
        </span>
        <AgentDropdown data={data} refetch={refetch} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
