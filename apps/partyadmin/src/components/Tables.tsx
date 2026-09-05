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
import { LGASupervisorTableHeader, LGASupervisorTableTile } from "./tiles/lga-supervisor-tile";
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
import { PollingAgentTableHeader, PollingAgentTableTile } from "./tiles/polling-agent-tile";
import {
	StateSupervisorTableHeader,
	StateSupervisorTableTile,
} from "./tiles/state-supervisor-tile";
import { UserTableHeader, UserTableTile, type UserType } from "./tiles/user-tile";
import { WardSupervisorTableHeader, WardSupervisorTableTile } from "./tiles/ward-supervisor-tile";
import { ElectoralUnitCursorTooltip } from "./tooltips/electoral-unit-tooltip";

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

export function ElectionInstancesTable({ items }: { items: ElectionInstanceType[] }) {
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

export type { UserType, MarketingCampaignType };

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

export function UsersTable({ items, refetch }: { items: UserType[]; refetch?: () => void }) {
	return (
		<div className="w-full">
			<UserTableHeader />
			<div>
				{items.map((data, index) => (
					<UserTableTile key={`${data.name || data.id}-${index}`} data={data} refetch={refetch} />
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

export function CandidateResultsTable({ items }: { items: CandidateResultItem[] }) {
	const list = Array.isArray(items) ? items : [];
	const sortedList = React.useMemo(() => {
		return [...list].sort(
			(a, b) => Number(b.vote_count ?? b.votes ?? 0) - Number(a.vote_count ?? a.votes ?? 0),
		);
	}, [list]);

	return (
		<div className="w-full overflow-x-auto">
			<CandidateResultTableHeader />
			<div>
				{sortedList.map((data, index) => (
					<CandidateResultTableTile
						key={data.party_short_name || data.party?.short_name || data.name || index}
						data={data}
						index={index}
					/>
				))}
			</div>
		</div>
	);
}

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
			<ElectoralUnitTableHeader unitTitle={unitTitle} isDrillable={isDrillable} />
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
						onMouseEnter={(e) => setHovered({ unit: data, x: e.clientX, y: e.clientY })}
						onMouseMove={(e) => setHovered({ unit: data, x: e.clientX, y: e.clientY })}
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
