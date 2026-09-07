import { AppAvatar } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { Check } from "lucide-react";
import * as React from "react";
import type { ElectoralUnitItem } from "../tiles/candidate-result-tile";
import { getPartyColor, getPartyDarkColor } from "../tiles/candidate-result-tile";

interface ElectoralUnitCursorTooltipProps {
	isOpen: boolean;
	x: number;
	y: number;
	unit: ElectoralUnitItem | null;
	unitTitle?: string;
	isLive?: boolean;
}

export function ElectoralUnitCursorTooltip({
	isOpen,
	x,
	y,
	unit,
	unitTitle = "States",
	isLive = false,
}: ElectoralUnitCursorTooltipProps) {
	const tooltipRef = React.useRef<HTMLDivElement>(null);
	const [position, setPosition] = React.useState({ left: 0, top: 0 });

	React.useEffect(() => {
		if (!isOpen || !unit) return;

		const width = 360;
		const estimatedHeight = 290;
		const offsetX = 16;
		const offsetY = 16;

		let targetLeft = x + offsetX;
		let targetTop = y + offsetY;

		if (typeof window !== "undefined") {
			// Flip to left if overflowing right
			if (targetLeft + width > window.innerWidth - 12) {
				targetLeft = Math.max(12, x - width - offsetX);
			}
			// Flip upwards if overflowing bottom
			if (targetTop + estimatedHeight > window.innerHeight - 12) {
				targetTop = Math.max(12, y - estimatedHeight - offsetY);
			}
		}

		setPosition({ left: targetLeft, top: targetTop });
	}, [x, y, isOpen, unit]);

	if (!isOpen || !unit) return null;

	const singularTitle =
		unitTitle.toLowerCase() === "states"
			? "State"
			: unitTitle.toLowerCase() === "senatorial districts"
				? "Senatorial District"
				: unitTitle.toLowerCase() === "federal constituencies"
					? "Federal Constituency"
					: unitTitle.toLowerCase() === "state constituencies"
						? "State Constituency"
						: unitTitle.toLowerCase() === "lgas"
							? "LGA"
							: unitTitle.toLowerCase() === "wards"
								? "Ward"
								: unitTitle.toLowerCase() === "polling units"
									? "Polling Unit"
									: unitTitle;

	const rawCandidates = isLive
		? unit.candidate_results_live || unit.candidate_results
		: unit.candidate_results;

	const candidateList =
		Array.isArray(rawCandidates) && rawCandidates.length > 0
			? [...rawCandidates].sort(
					(a: any, b: any) =>
						(Number(b.vote_count ?? b.votes) || 0) - (Number(a.vote_count ?? a.votes) || 0)
				)
			: [];

	const topCandidates = candidateList.slice(0, 5);

	let progressText = "";
	const validVotes = Number(unit.valid_votes ?? unit.total_valid_votes ?? 0);
	const totalVotes = Number(unit.leading_votes ?? unit.vote_count ?? 0);
	if (unit.total_sub_units && unit.total_sub_units > 0) {
		const pct = Math.round(((unit.sub_units_counted || 0) / unit.total_sub_units) * 100);
		progressText = `Est. vote in: ${pct}% (${unit.sub_units_counted || 0}/${unit.total_sub_units})`;
	} else if (validVotes > 0) {
		progressText = `Valid votes: ${validVotes.toLocaleString()}`;
	} else if (totalVotes > 0) {
		progressText = `Total votes: ${totalVotes.toLocaleString()}`;
	} else {
		progressText = "No results reported yet";
	}

	return (
		<div
			ref={tooltipRef}
			style={{
				left: `${position.left}px`,
				top: `${position.top}px`,
			}}
			className={cn(
				"pointer-events-none fixed z-50 w-[350px] rounded-xl bg-white dark:bg-[#1C1C1E]",
				"border border-neutral-200/90 dark:border-neutral-800 shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
				"overflow-hidden transition-[opacity,transform] duration-75 ease-out",
				isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
			)}
		>
			{/* Tooltip Header */}
			<div className="px-3.5 pt-3 pb-2.5">
				<h3 className="text-[15px] font-bold text-neutral-900 dark:text-white tracking-tight truncate">
					{singularTitle}: {unit.name}
				</h3>
			</div>

			{/* Candidate Rows */}
			<div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
				{topCandidates.length === 0 ? (
					<div className="py-4 text-center text-xs text-neutral-400">
						No candidate results reported yet
					</div>
				) : (
					topCandidates.map((cand: any, idx: number) => {
						const pShort = cand.party_short_name || cand.party?.short_name || "";
						const partyFullName = cand.party?.name || cand.party_name || pShort || "";
						const hasCandidate =
							cand.candidate !== undefined
								? Boolean(cand.candidate && cand.candidate.name?.trim())
								: Boolean(
										cand.candidate_name?.trim() &&
										cand.candidate_name?.trim() !== partyFullName &&
										cand.candidate_name?.trim() !== pShort
									);

						const rawCandName = hasCandidate
							? cand.candidate?.name?.trim() || cand.candidate_name?.trim() || ""
							: "";

						const hasPartySuffix =
							pShort && rawCandName.endsWith(`(${pShort})`);
						const cleanCandidateName = hasPartySuffix
							? rawCandName.slice(0, -`(${pShort})`.length).trim()
							: rawCandName;

						const candName = hasCandidate
							? cleanCandidateName
							: pShort || partyFullName || "-";

						const partySubtitle = hasCandidate ? partyFullName || pShort : pShort;
						const avatar =
							cand.candidate?.avatar || cand.candidate_avatar || cand.party?.logo || cand.party_logo || "";
						const color = cand.color_hex || cand.party?.color_hex || getPartyColor(pShort, idx);
						const darkColor =
							cand.dark_color_hex || cand.party?.dark_color_hex || getPartyDarkColor(pShort, idx);

						const votes = Number(cand.vote_count ?? cand.votes ?? 0);
						const pct = Number(cand.percentage ?? cand.vote_share ?? 0);
						const isLeader = idx === 0 && votes > 0;

						return (
							<div
								key={pShort || idx}
								className={cn(
									"relative flex items-center justify-between px-3.5 py-2.5 transition-colors gap-3",
									isLeader ? "bg-neutral-50/80 dark:bg-neutral-800/40" : "bg-transparent"
								)}
								style={
									isLeader
										? ({
												"--party-bar": color,
												"--party-bar-dark": darkColor,
											} as React.CSSProperties)
										: undefined
								}
							>
								{/* Left vertical party accent bar */}
								<span
									className="absolute left-0 top-0 bottom-0 w-1.5"
									style={{
										backgroundColor: color,
									}}
								/>

								{/* Left candidate info with Avatar */}
								<div className="pl-1.5 flex items-center gap-2.5 min-w-0 flex-1">
									<AppAvatar
										src={avatar}
										alt={candName}
										className="size-8 shrink-0 rounded-full border border-neutral-200/60 dark:border-neutral-700/60"
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<span className="text-[13.5px] font-bold text-neutral-900 dark:text-white truncate leading-tight">
												{candName}
												{hasCandidate && pShort && (
													<span className="text-neutral-500 dark:text-neutral-400 font-normal ml-1">
														({pShort})
													</span>
												)}
											</span>
											{isLeader && (
												<span className="size-3.5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0">
													<Check className="size-2.5 stroke-[3]" />
												</span>
											)}
										</div>
										<p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 truncate leading-tight mt-0.5">
											{partySubtitle}
										</p>
									</div>
								</div>

								{/* Right percentage and votes */}
								<div className="text-right shrink-0">
									<p className="text-[13.5px] font-bold text-neutral-900 dark:text-white leading-tight">
										{pct > 0 ? (pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`) : "0.0%"}
									</p>
									<p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
										{votes.toLocaleString()}
									</p>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Tooltip Footer */}
			<div className="px-3.5 py-2 bg-neutral-50/90 dark:bg-neutral-900/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
				<span className="font-medium">{progressText}</span>
				<span className="flex items-center gap-1 font-semibold">
					<span
						className={cn(
							"size-1.5 rounded-full inline-block",
							isLive ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
						)}
					/>
					{isLive ? "Live" : "Final"}
				</span>
			</div>
		</div>
	);
}
