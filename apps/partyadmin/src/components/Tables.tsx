/**
 * @file Master Table Layout Containers
 * @description Central collection of table wrapper components used throughout the Party Admin app.
 * Encapsulates table header rows, tile rows, sorting, mouse interactions, and drill-down navigation
 * for all primary domain entities (Elections, Applications, Party Members, Users, Marketing,
 * Agents, Supervisors, Race Results, Operations, and Agent Coverage).
 */

import * as React from "react";
import type { AgentPerformanceItem } from "#/lib/server/agents";
import {
  ApplicationTableHeader,
  ApplicationTableTile,
  type ApplicationType,
} from "./tiles/application-tile";
import {
  type CandidateResultItem,
  CandidateResultTableHeader,
  CandidateResultTableTile,
  type ElectoralUnitItem,
  ElectoralUnitTableHeader,
  ElectoralUnitTableTile,
} from "./tiles/candidate-result-tile";
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
  LGASupervisorTableHeader,
  LGASupervisorTableTile,
} from "./tiles/lga-supervisor-tile";
import {
  type MarketingCampaignType,
  MarketingTableHeader,
  MarketingTableTile,
} from "./tiles/marketing-tile";
import {
  PartyAdminTableHeader,
  PartyAdminTableTile,
  type PartyAdminType,
} from "./tiles/party-member-tile";
import {
  PollingAgentTableHeader,
  PollingAgentTableTile,
} from "./tiles/polling-agent-tile";
import {
  StateSupervisorTableHeader,
  StateSupervisorTableTile,
} from "./tiles/state-supervisor-tile";
import {
  UserTableHeader,
  UserTableTile,
  type UserType,
} from "./tiles/user-tile";
import {
  WardSupervisorTableHeader,
  WardSupervisorTableTile,
} from "./tiles/ward-supervisor-tile";
import {
  OperationsTableHeader,
  OperationsTableTile,
  PollingUnitOperationsTableHeader,
  PollingUnitOperationsTableTile,
} from "./tiles/operations-tile";
import type { OperationsUnitItem } from "#/lib/server/election-operations";
import {
  AgentCoverageTableHeader,
  AgentCoverageTableTile,
  PollingUnitAgentCoverageTableHeader,
  PollingUnitAgentCoverageTableTile,
} from "./tiles/agent-coverage-tile";
import type { AgentCoverageUnitItem } from "#/lib/server/agent-coverage";
import { ElectoralUnitCursorTooltip } from "./tooltips/electoral-unit-tooltip";

/**
 * ElectionGroupsTable Component
 * Renders table container for high-level election categories (e.g. General Elections 2023).
 */
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

/**
 * ElectionInstancesTable Component
 * Renders table container for specific contested election ballots (e.g. Senatorial, Gubernatorial).
 */
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

/**
 * ApplicationsTable Component
 * Renders table container for incoming, accepted, or rejected membership applications.
 */
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

export type { UserType, MarketingCampaignType };

/**
 * PartyAdminsTable Component
 * Renders table container for party officials with dynamic column label support.
 */
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

/**
 * UsersTable Component
 * Renders table container for party user accounts with refetch capability on updates.
 */
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

/**
 * MarketingTable Component
 * Renders horizontally scrollable table container for marketing campaigns.
 */
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

/**
 * PollingAgentsTable Component
 * Renders horizontally scrollable table container for polling unit agents.
 */
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
          <PollingAgentTableTile
            key={data.id || index}
            data={data}
            refetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * WardSupervisorsTable Component
 * Renders horizontally scrollable table container for Ward-level coordinators.
 */
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
          <WardSupervisorTableTile
            key={data.id || index}
            data={data}
            refetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * LGASupervisorsTable Component
 * Renders horizontally scrollable table container for LGA-level supervisors.
 */
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
          <LGASupervisorTableTile
            key={data.id || index}
            data={data}
            refetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * StateSupervisorsTable Component
 * Renders horizontally scrollable table container for State-level directors.
 */
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
          <StateSupervisorTableTile
            key={data.id || index}
            data={data}
            refetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * CandidateResultsTable Component
 * Renders sorted election race results container (ordered descending by vote count).
 */
export function CandidateResultsTable({
  items,
}: {
  items: CandidateResultItem[];
}) {
  const list = Array.isArray(items) ? items : [];
  // Sort candidates by vote count descending
  const sortedList = React.useMemo(() => {
    return [...list].sort(
      (a, b) =>
        Number(b.vote_count ?? b.votes ?? 0) -
        Number(a.vote_count ?? a.votes ?? 0),
    );
  }, [list]);

  return (
    <div className="w-full overflow-x-auto">
      <CandidateResultTableHeader />
      <div>
        {sortedList.map((data, index) => (
          <CandidateResultTableTile
            key={
              data.party_short_name ||
              data.party?.short_name ||
              data.name ||
              index
            }
            data={data}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ElectoralUnitsTable Component
 * Renders electoral breakdown table with mouse hover tooltip and hierarchical drill-down navigation.
 */
export function ElectoralUnitsTable({
  items,
  unitTitle = "States",
  isLive = false,
  onSelectUnit,
}: {
  items: ElectoralUnitItem[];
  unitTitle?: string;
  isLive?: boolean;
  onSelectUnit?: (item: ElectoralUnitItem) => void;
}) {
  const list = Array.isArray(items) ? items : [];
  const [hovered, setHovered] = React.useState<{
    unit: ElectoralUnitItem;
    x: number;
    y: number;
  } | null>(null);

  const isDrillable = !!onSelectUnit;

  return (
    <div className="w-full overflow-x-auto relative">
      <ElectoralUnitTableHeader
        unitTitle={unitTitle}
        isDrillable={isDrillable}
      />
      <div>
        {list.map((data, index) => (
          <ElectoralUnitTableTile
            key={`${data.name}-${data.id || index}`}
            data={data}
            index={index}
            isLive={isLive}
            onClick={
              onSelectUnit
                ? () => {
                    setHovered(null);
                    onSelectUnit(data);
                  }
                : undefined
            }
            onMouseEnter={(e) =>
              setHovered({ unit: data, x: e.clientX, y: e.clientY })
            }
            onMouseMove={(e) =>
              setHovered({ unit: data, x: e.clientX, y: e.clientY })
            }
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      <ElectoralUnitCursorTooltip
        isOpen={!!hovered}
        x={hovered?.x ?? 0}
        y={hovered?.y ?? 0}
        unit={hovered?.unit ?? null}
        unitTitle={unitTitle}
        isLive={isLive}
      />
    </div>
  );
}

/**
 * OperationsTable Component
 * Renders operational telemetry table with automatic switching between higher-level units
 * and granular leaf Polling Units.
 */
export function OperationsTable({
  items,
  unitTitle = "States",
  unitType = "states",
  supervisorTitle = "State Supervisors",
  onSelectUnit,
}: {
  items: OperationsUnitItem[];
  unitTitle?: string;
  unitType?: string;
  supervisorTitle?: string;
  onSelectUnit?: (item: OperationsUnitItem) => void;
}) {
  const list = Array.isArray(items) ? items : [];
  const isPU = unitType === "polling_units" || unitTitle === "Polling Units";
  const isDrillable = !isPU && !!onSelectUnit;

  return (
    <div className="w-full overflow-x-auto relative">
      {isPU ? (
        <PollingUnitOperationsTableHeader />
      ) : (
        <OperationsTableHeader
          unitTitle={unitTitle}
          supervisorTitle={supervisorTitle}
          isDrillable={isDrillable}
        />
      )}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {list.map((data, index) =>
          isPU ? (
            <PollingUnitOperationsTableTile
              key={`${data.name}-${data.id || index}`}
              data={data}
            />
          ) : (
            <OperationsTableTile
              key={`${data.name}-${data.id || index}`}
              data={data}
              onClick={isDrillable ? () => onSelectUnit(data) : undefined}
            />
          ),
        )}
      </div>
    </div>
  );
}

/**
 * AgentCoverageTable Component
 * Renders agent deployment coverage table across administrative levels with agent assignment triggers.
 */
export function AgentCoverageTable({
  items,
  unitTitle = "States",
  unitType = "states",
  supervisorTitle = "State Supervisor",
  onSelectUnit,
  onAssign,
}: {
  items: AgentCoverageUnitItem[];
  unitTitle?: string;
  unitType?: string;
  supervisorTitle?: string;
  onSelectUnit?: (item: AgentCoverageUnitItem) => void;
  onAssign?: (item: AgentCoverageUnitItem) => void;
}) {
  const list = Array.isArray(items) ? items : [];
  const isPU = unitType === "polling_units" || unitTitle === "Polling Units";
  const isDrillable = !isPU && !!onSelectUnit;

  return (
    <div className="w-full overflow-x-auto relative">
      {isPU ? (
        <PollingUnitAgentCoverageTableHeader />
      ) : (
        <AgentCoverageTableHeader
          unitTitle={unitTitle}
          unitType={unitType}
          supervisorTitle={supervisorTitle}
        />
      )}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {list.map((data, index) =>
          isPU ? (
            <PollingUnitAgentCoverageTableTile
              key={`${data.name}-${data.id || index}`}
              data={data}
              onAssign={onAssign}
            />
          ) : (
            <AgentCoverageTableTile
              key={`${data.name}-${data.id || index}`}
              data={data}
              unitType={unitType}
              onClick={isDrillable ? () => onSelectUnit(data) : undefined}
              onAssign={onAssign}
            />
          ),
        )}
      </div>
    </div>
  );
}

