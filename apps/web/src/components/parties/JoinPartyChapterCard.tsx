import React from "react";
import { ChevronRight, Check } from "lucide-react";

export type JoinPartyChapterCardProps = {
	title: string;
	appendix?: string;
	avatarUrl?: string;
	partyLogo?: string;
	isSelected?: boolean;
	onSelect: () => void;
	className?: string;
};

export function JoinPartyChapterCard({
	title,
	appendix,
	avatarUrl,
	partyLogo,
	isSelected = false,
	onSelect,
	className = "",
}: JoinPartyChapterCardProps) {
	const imageSrc = avatarUrl || partyLogo;

	return (
		<div
			onClick={onSelect}
			className={`flex items-center gap-3.5 p-2 rounded-2xl transition-all cursor-pointer group ${isSelected ? "bg-sidebar-softer" : "hover:bg-muted/40"
				} ${className}`}
		>
			<img
				src={imageSrc}
				alt={title}
				className="size-13 rounded-full object-cover shrink-0 border border-border/60 shadow-xs group-hover:scale-105 transition-transform"
			/>
			<div className="flex flex-col items-start gap-1 min-w-0">
				<div className="flex items-baseline gap-1.5 truncate max-w-full">
					<span className="text-sm font-medium text-foreground truncate">
						{title}
					</span>
					{appendix && (
						<span className="text-xs text-muted-foreground font-normal shrink-0">
							{appendix}
						</span>
					)}
				</div>

				<span
					className={`inline-flex items-center gap-1 text-xs font-medium transition-colors
						${isSelected ? "text-primary font-semibold"
							: "text-muted-foreground group-hover:text-foreground group-hover:underline underline-offset-4"
						}`}
				>
					<span>{isSelected ? "Selected" : "Select this chapter"}</span>
					{isSelected ? (
						<Check className="size-3 stroke-[2.5] text-primary" />
					) : (
						<ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
					)}
				</span>
			</div>
		</div>
	);
}
