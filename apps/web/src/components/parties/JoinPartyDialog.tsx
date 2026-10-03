import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogPadding,
} from "@repo/ui/components/dialog";
import { AlertCircle, CheckCircle2, Globe2, Loader2, MapPin, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export type JoinPartyDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	partyId: number;
	partyName: string;
	partyFullName?: string;
	partyLogo?: string;
	colorHex?: string | null;
	isJoining: boolean;
	onConfirmJoin: () => void;
	userLocation?: {
		stateName?: string;
		cityName?: string;
	};
	isAuthenticated?: boolean;
};

/**
 * JoinPartyDialog
 * 
 * Interactive modal presenting a detailed summary of the party,
 * explaining the membership enrollment (national and local chapter resolution),
 * displaying the user's registered area, and commitment guidelines before confirming.
 */
export function JoinPartyDialog({
	open,
	onOpenChange,
	partyId,
	partyName,
	partyFullName,
	partyLogo,
	colorHex,
	isJoining,
	onConfirmJoin,
	userLocation,
	isAuthenticated = true,
}: JoinPartyDialogProps) {
	const brandColor = colorHex || "#16a34a";
	const displayName = partyFullName || partyName;

	return (
		<Dialog open={open} onOpenChange={(val) => !isJoining && onOpenChange(val)}>
			<DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border shadow-2xl rounded-2xl bg-card">
				{/* Top Branding Banner */}
				<div 
					className="relative h-20 w-full flex items-center justify-between px-6 overflow-hidden"
					style={{
						background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}44 100%)`,
						borderBottom: `2px solid ${brandColor}40`,
					}}
				>
					<div className="flex items-center gap-3 z-10">
						<div 
							className="size-13 rounded-full border-2 border-white/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center p-1 shadow-md shrink-0"
							style={{ boxShadow: `0 0 0 2px ${brandColor}60` }}
						>
							{partyLogo ? (
								<img src={partyLogo} alt={partyName} className="w-full h-full object-contain rounded-full" />
							) : (
								<span className="text-sm font-black" style={{ color: brandColor }}>
									{partyName}
								</span>
							)}
						</div>
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Party Membership
							</span>
							<h3 className="text-lg font-extrabold text-foreground leading-tight">
								{partyName.toUpperCase()}
							</h3>
						</div>
					</div>

					<div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-xs text-[11px] font-medium text-foreground border border-border shadow-xs">
						<ShieldCheck className="size-3.5 text-primary" />
						<span>Official</span>
					</div>
				</div>

				<DialogHeader
					title="Confirm Membership"
					description={`You are about to register your political affiliation with ${displayName}.`}
					className="px-6 pt-4 pb-2"
				/>

				<DialogPadding className="px-6 py-2 space-y-4 max-h-[60vh] overflow-y-auto">
					{!isAuthenticated ? (
						<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-2">
							<div className="flex items-center gap-2 font-semibold">
								<AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
								<span>Authentication Required</span>
							</div>
							<p className="text-xs text-muted-foreground">
								You must be signed in to become a registered member of this party.
							</p>
							<div className="pt-2">
								<Link
									to={APP_URL.auth.login}
									className="inline-block px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
								>
									Sign In Now
								</Link>
							</div>
						</div>
					) : (
						<>
							{/* Chapter Affiliation Info Card */}
							<div className="p-3.5 rounded-xl bg-muted/50 border border-border/80 space-y-2.5">
								<div className="flex items-center gap-2 text-xs font-semibold text-foreground">
									<Globe2 className="size-4 text-primary" />
									<span>Chapter Enrollment</span>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									You will be automatically enrolled into the <strong>National Chapter</strong> and affiliated with your registered ward and state constituency.
								</p>

								{userLocation?.stateName && (
									<div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/80 bg-background/70 px-2.5 py-1.5 rounded-md border border-border/60">
										<MapPin className="size-3.5 text-muted-foreground shrink-0" />
										<span>Registered Area:</span>
										<strong className="text-foreground">
											{[userLocation.cityName, userLocation.stateName].filter(Boolean).join(", ")}
										</strong>
									</div>
								)}
							</div>

							{/* Key Membership Rules */}
							<div className="space-y-2 text-xs">
								<span className="font-semibold text-foreground flex items-center gap-1.5">
									<UserCheck className="size-3.5 text-primary" />
									<span>Membership Guidelines</span>
								</span>
								<ul className="space-y-1.5 text-muted-foreground pl-1">
									<li className="flex items-start gap-2">
										<CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
										<span>You cannot belong to multiple political parties concurrently.</span>
									</li>
									<li className="flex items-start gap-2">
										<CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
										<span>Your profile will reflect your active membership status across Free9ja.</span>
									</li>
									<li className="flex items-start gap-2">
										<CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
										<span>You can resign or transfer chapters at any time from your settings.</span>
									</li>
								</ul>
							</div>
						</>
					)}
				</DialogPadding>

				<DialogFooter className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-end gap-2.5">
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						disabled={isJoining}
						className="px-4 py-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
					>
						Cancel
					</button>

					{isAuthenticated && (
						<button
							type="button"
							onClick={onConfirmJoin}
							disabled={isJoining}
							className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-primary-foreground shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
							style={{ backgroundColor: brandColor }}
						>
							{isJoining ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									<span>Joining {partyName}...</span>
								</>
							) : (
								<span>Join {partyName}</span>
							)}
						</button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
