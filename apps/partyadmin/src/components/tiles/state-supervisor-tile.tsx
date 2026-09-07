import type { AgentPerformanceItem } from "#/lib/server/agents";
import { AppAvatar } from "@repo/ui/components/avatar";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { StatusCheckIcon } from "./polling-agent-tile";
import { AgentDropdown } from "../dropdowns/AgentDropdown";

export function StateSupervisorTableHeader() {
  return (
    <TileHeader className="min-w-max">
      <TileLeft className="min-w-fit">
        <span className="text-c-50 text-[14px] min-w-[200px]">User</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-4">
        <span className="text-c-50 text-[14px] w-[90px]">Readiness</span>
        <span className="text-c-50 text-[14px] w-[110px]">Agents at post</span>
        <span className="text-c-50 text-[14px] w-[110px]">PU coverage</span>
        <span className="text-c-50 text-[14px] w-[140px]">
          PU agent coverage
        </span>
        <span className="text-c-50 text-[14px] w-[130px]">
          Avg. Arrival time
        </span>
        <span className="text-c-50 text-[14px] w-[130px]">
          Election started in
        </span>
        <span className="text-c-50 text-[14px] w-[130px]">
          Election ended in
        </span>
        <span className="text-c-50 text-[14px] w-[110px]">Updates Given</span>
        <span className="text-c-50 text-[14px] w-[110px]">Reports Given</span>
        <span className="text-c-50 text-[14px] w-[110px]">Reported PUs</span>
        <span className="text-c-50 text-[14px] w-[170px]">
          Agent Live voters referred
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
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function StateSupervisorTableTile({
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
        <span className="w-[110px]">{data.agents_at_post || "—"}</span>
        <span className="w-[110px]">{data.pu_coverage || "—"}</span>
        <span className="w-[140px]">{data.pu_agent_coverage || "—"}</span>
        <span className="w-[130px] font-medium">
          {data.arrived_at || data.avg_arrival_time || "—"}
        </span>
        <span className="w-[130px] font-medium">
          {data.election_started_in || data.election_started_at || "—"}
        </span>
        <span className="w-[130px] font-medium">
          {data.election_ended_in || data.election_ended_at || "—"}
        </span>
        <span className="w-[110px]">{data.updates_given ?? 0}</span>
        <span className="w-[110px]">{data.reports_given ?? 0}</span>
        <span className="w-[110px]">{data.reported_pus ?? "—"}</span>
        <span className="w-[170px]">{data.live_voters_referred ?? 0}</span>
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
        <AgentDropdown data={data} refetch={refetch} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
