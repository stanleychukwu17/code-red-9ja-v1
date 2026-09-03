import {
  ElectionGroupTableHeader,
  ElectionGroupTableTile,
  type ElectionGroupType,
} from "./tiles/election-group-tile";
import {
  ElectionInstanceTableHeader,
  ElectionInstanceTableTile,
  type ElectionInstanceType,
} from "./tiles/election-instance-tile";
import {
  ApplicationTableHeader,
  ApplicationTableTile,
  type ApplicationType,
} from "./tiles/application-tile";
import {
  PartyAdminTableHeader,
  PartyAdminTableTile,
  type PartyAdminType,
} from "./tiles/party-member-tile";
import {
  UserTableHeader,
  UserTableTile,
  type UserType,
} from "./tiles/user-tile";
import {
  MarketingTableHeader,
  MarketingTableTile,
  type MarketingCampaignType,
} from "./tiles/marketing-tile";
import {
  PollingAgentTableHeader,
  PollingAgentTableTile,
} from "./tiles/polling-agent-tile";
import {
  WardSupervisorTableHeader,
  WardSupervisorTableTile,
} from "./tiles/ward-supervisor-tile";
import {
  LGASupervisorTableHeader,
  LGASupervisorTableTile,
} from "./tiles/lga-supervisor-tile";
import {
  StateSupervisorTableHeader,
  StateSupervisorTableTile,
} from "./tiles/state-supervisor-tile";
import type { AgentPerformanceItem } from "#/lib/server/agents";

export function ElectionGroupsTable({ items }: { items: ElectionGroupType[] }) {
  return (
    <div className="w-full">
      <ElectionGroupTableHeader />

      <div>
        {items.map((data) => (
          <ElectionGroupTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function ElectionInstancesTable({
  items,
}: {
  items: ElectionInstanceType[];
}) {
  return (
    <div className="w-full">
      <ElectionInstanceTableHeader />

      <div>
        {items.map((data) => (
          <ElectionInstanceTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function ApplicationsTable({
  items,
  refetch,
}: {
  items: readonly ApplicationType[];
  refetch?: () => void;
}) {
  return (
    <div className="w-full">
      <ApplicationTableHeader />

      <div>
        {items.map((data, index) => (
          <ApplicationTableTile
            key={`${data.id || data.name || index}-${index}`}
            data={data}
            refetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}

export { type UserType, type MarketingCampaignType };

export function PartyAdminsTable({
  columns,
  items,
}: {
  columns: string[];
  items: readonly PartyAdminType[];
}) {
  return (
    <div className="w-full">
      <PartyAdminTableHeader columns={columns} />

      <div>
        {items.map((data, index) => (
          <PartyAdminTableTile key={`${data.name}-${index}`} data={data} />
        ))}
      </div>
    </div>
  );
}

export function UsersTable({
  items,
  refetch,
}: {
  items: UserType[];
  refetch?: () => void;
}) {
  return (
    <div className="w-full">
      <UserTableHeader />
      <div>
        {items.map((data, index) => (
          <UserTableTile
            key={`${data.name || data.id}-${index}`}
            data={data}
            refetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}

export function MarketingTable({ items }: { items: MarketingCampaignType[] }) {
  const campaignsList = Array.isArray(items) ? items : [];
  return (
    <div className="w-full overflow-x-auto">
      <MarketingTableHeader />
      <div>
        {campaignsList.map((data, index) => (
          <MarketingTableTile key={data.id || index} data={data} />
        ))}
      </div>
    </div>
  );
}

export function PollingAgentsTable({
  items,
  refetch,
}: {
  items: AgentPerformanceItem[];
  refetch?: () => void;
}) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="w-full overflow-x-auto">
      <PollingAgentTableHeader />
      <div>
        {list.map((data, index) => (
          <PollingAgentTableTile key={data.id || index} data={data} refetch={refetch} />
        ))}
      </div>
    </div>
  );
}

export function WardSupervisorsTable({
  items,
  refetch,
}: {
  items: AgentPerformanceItem[];
  refetch?: () => void;
}) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="w-full overflow-x-auto">
      <WardSupervisorTableHeader />
      <div>
        {list.map((data, index) => (
          <WardSupervisorTableTile key={data.id || index} data={data} refetch={refetch} />
        ))}
      </div>
    </div>
  );
}

export function LGASupervisorsTable({
  items,
  refetch,
}: {
  items: AgentPerformanceItem[];
  refetch?: () => void;
}) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="w-full overflow-x-auto">
      <LGASupervisorTableHeader />
      <div>
        {list.map((data, index) => (
          <LGASupervisorTableTile key={data.id || index} data={data} refetch={refetch} />
        ))}
      </div>
    </div>
  );
}

export function StateSupervisorsTable({
  items,
  refetch,
}: {
  items: AgentPerformanceItem[];
  refetch?: () => void;
}) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="w-full overflow-x-auto">
      <StateSupervisorTableHeader />
      <div>
        {list.map((data, index) => (
          <StateSupervisorTableTile key={data.id || index} data={data} refetch={refetch} />
        ))}
      </div>
    </div>
  );
}
