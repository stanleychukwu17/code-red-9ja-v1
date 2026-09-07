import { Button } from "@repo/ui/components/button";
import {
	LeaderboardCardRow,
	LeaderboardCardWrapper,
} from "@repo/ui/components/cards/leaderboard-card";
import ReportIcon from "@repo/ui/icons/report-icon";
import { formatVotes } from "@repo/ui/lib/number";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAppContext } from "#/hooks/useAppContext";

export function CandidatesLeaderboard({
	onPracticeClick,
	onReportClick,
	hideReportButton,
}: {
	onPracticeClick?: () => void;
	onReportClick?: () => void;
	hideReportButton?: boolean;
}) {
	const navigate = useNavigate();
	const {
		selectedElection,
		electionCandidates,
		finalResultObj,
		isLive,
		isResultLoading,
		selectedSupervisorAssignment,
		isLock,
	} = useAppContext();

	const interceptClick = (e: React.MouseEvent, action?: () => void) => {
		if (onPracticeClick) {
			e.preventDefault();
			e.stopPropagation();
			onPracticeClick();
			return;
		}
		if (action) action();
	};

	const rawList = isLive
		? finalResultObj?.candidate_results_live || finalResultObj?.candidate_results
		: finalResultObj?.candidate_results;

	const sortedResults = useMemo(() => {
		if (Array.isArray(rawList) && rawList.length > 0) {
			return [...rawList].sort(
				(a: any, b: any) => (Number(b.vote_count) || 0) - (Number(a.vote_count) || 0)
			);
		}
		// Fallback if candidate_results not yet populated: use electionCandidates
		if (Array.isArray(electionCandidates) && electionCandidates.length > 0) {
			return electionCandidates.map((c: any) => {
				const ps = c.party_short_name?.String || c.party_short_name || "";
				const firstName = c.first_name?.String || c.first_name || "";
				const lastName = c.last_name?.String || c.last_name || "";
				const avatar = c.avatar?.String || c.avatar || "";
				const partyLogo = c.party_logo?.String || c.party_logo || "";
				return {
					party_short_name: ps,
					vote_count: 0,
					candidate: {
						name: `${firstName} ${lastName}`.trim(),
						avatar,
					},
					party: {
						short_name: ps,
						logo: partyLogo,
					},
				};
			});
		}
		return [];
	}, [rawList, electionCandidates]);

	return (
		<LeaderboardCardWrapper className="mx-2.5">
			{isResultLoading ? (
				<div className="flex items-center justify-center h-full flex-1">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : !selectedElection?.id ? (
				<div className="flex items-center justify-center h-full flex-1 text-neutral-500 text-sm">
					Select an election to see candidates
				</div>
			) : sortedResults.length === 0 ? (
				<div className="flex items-center justify-center h-full flex-1 text-neutral-500 text-sm">
					No candidates found
				</div>
			) : (
				sortedResults.slice(0, 3).map((item: any, index: number) => {
					const partyShortName: string =
						item.party_short_name || item.party?.short_name || item.short_name || "";
					const candidateName: string | null =
						item.candidate?.name?.trim() ||
						item.name ||
						item.candidate_name ||
						(item.first_name ? `${item.first_name} ${item.last_name || ""}`.trim() : null) ||
						partyShortName;
					const candidateAvatar: string | undefined =
						item.candidate?.avatar || item.candidate_avatar || item.avatar;
					const partyLogo: string | undefined = item.party?.logo || item.party_logo || item.logo;
					const votes: number = Number(item.vote_count ?? item.votes ?? 0);

					let regionsWinningCountStr = `${item.states_winning_count || 0} states`;
					if (isLock) {
						if (selectedSupervisorAssignment?.type === "state") {
							regionsWinningCountStr = `${item.lgas_winning_count || 0} LGAs`;
						} else if (selectedSupervisorAssignment?.type === "lga") {
							regionsWinningCountStr = `${item.wards_winning_count || 0} wards`;
						} else if (
							selectedSupervisorAssignment?.type === "ward" ||
							!selectedSupervisorAssignment
						) {
							regionsWinningCountStr = `${item.polling_units_winning_count || 0} PUs`;
						}
					}

					return (
						<LeaderboardCardRow
							key={partyShortName || index}
							rank={index + 1}
							image={candidateAvatar || partyLogo}
							image2={partyLogo}
							name={candidateName ? `${candidateName} (${partyShortName})` : partyShortName}
							regionsWinningCount={regionsWinningCountStr}
							votesCount={formatVotes(votes)}
						/>
					);
				})
			)}

			{/* Buttons */}
			<div className="flex items-center gap-4 mb-2 mt-2 px-4">
				<Button
					type="button"
					size="extra-large"
					onClick={(e) => interceptClick(e)}
					className="bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
				>
					Show all
				</Button>
				{!hideReportButton && (
					<Button
						type="button"
						size="extra-large"
						onClick={(e) => {
							if (onReportClick) {
								e.preventDefault();
								e.stopPropagation();
								onReportClick();
							} else {
								navigate({ to: "/give-update", search: { isReport: true } });
							}
						}}
						className="bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
					>
						<ReportIcon className="w-5 h-5 shrink-0" />
						Report
					</Button>
				)}
			</div>
		</LeaderboardCardWrapper>
	);
}
