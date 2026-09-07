import {
	type Election,
	type ElectionGroup,
	SelectElectionGroupAndElection,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { useServerFn } from "@tanstack/react-start";
import { useAppContext } from "#/hooks/useAppContext";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { ElectionScopeSelector } from "../home/components/-election-scope-selector";
import { ResultModeToggle } from "../home/components/-result-mode-toggle";

// ─── Electoral Race Custom Header (Design from mockup) ──────────────────────
export function ElectionRaceHeader() {
	const {
		party,
		selectedElectionGroup,
		setSelectedElectionGroup,
		selectedElection,
		setSelectedElection,
		isLive,
		setIsLive,
	} = useAppContext();
	const partyId = party?.id;

	const fetchGroups = useServerFn(getElectionGroups);
	const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

	return (
		<div className="w-full flex items-center justify-between flex-wrap gap-4 py-3">
			{/* Left branding title */}
			<div className="flex items-center gap-1.5 select-none">
				<span className="text-neutral-900 dark:text-white font-black text-xl sm:text-2xl tracking-tight">
					Electoral Race
				</span>
				<span className="text-[#EF4444] font-black text-xl sm:text-2xl tracking-tight">
					In Nigeria
				</span>
			</div>

			{/* Right Controls: Live status, Result mode toggle, and Election selector */}
			<div className="flex items-center gap-4 flex-wrap">
				{/* Live status badge */}
				<div className="flex items-center gap-2">
					<span
						className={`size-2.5 rounded-full ${
							isLive ? "bg-[#0099FF] animate-pulse" : "bg-neutral-400"
						}`}
					/>
					<span className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
						Live
					</span>
				</div>

				{/* Final Result Toggle */}
				<ResultModeToggle isLive={isLive} setIsLive={setIsLive} />

				{/* Election Selector Dropdown */}
				<SelectElectionGroupAndElection
					fetchElectionGroups={fetchGroups}
					fetchElectionsByGroup={fetchElectionsByGroup}
					selectedId={selectedElectionGroup?.id}
					update={(group) => setSelectedElectionGroup(group)}
					className="w-fit"
					onElectionSelect={(group: ElectionGroup, election: Election) => {
						setSelectedElectionGroup(group);
						setSelectedElection(election);
					}}
					partyId={partyId}
				/>
			</div>
		</div>
	);
}

// ─── Candidate Results Header Right (For tabs with standard PageHeader) ──────
export function ElectionRaceHeaderRight({
	isLive,
	setIsLive,
}: {
	isLive: boolean;
	setIsLive: (val: boolean) => void;
}) {
	const { party, selectedElectionGroup, setSelectedElectionGroup, setSelectedElection } =
		useAppContext();
	const partyId = party?.id;

	const fetchGroups = useServerFn(getElectionGroups);
	const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

	return (
		<div className="flex items-center gap-3">
			<ResultModeToggle isLive={isLive} setIsLive={setIsLive} />
			<SelectElectionGroupAndElection
				fetchElectionGroups={fetchGroups}
				fetchElectionsByGroup={fetchElectionsByGroup}
				selectedId={selectedElectionGroup?.id}
				update={(group) => setSelectedElectionGroup(group)}
				className="w-fit"
				onElectionSelect={(group: ElectionGroup, election: Election) => {
					setSelectedElectionGroup(group);
					setSelectedElection(election);
				}}
				partyId={partyId}
			/>
		</div>
	);
}

// ─── Scope Filter Bar ────────────────────────────────────────────────────────
export function ElectionRaceFilterBar() {
	return (
		<div className="flex items-center gap-3 flex-wrap">
			<ElectionScopeSelector />
		</div>
	);
}
