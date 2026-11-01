import { Plus } from "lucide-react";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";

export type ElectionCandidateRowProps = {
  candidate: any;
  userPartyShortName?: string;
  ticketConfig: {
    principalRole: string;
    hasRunningMate?: boolean;
  };
  onFollowCandidate?: () => void;
  onFollowRunningMate?: () => void;
};

/**
 * Candidate Showcase Card displaying party header (name & logo) and fielded
 * candidates (principal candidate and running mate) matching the ticket showcase design.
 */
export function ElectionCandidateRow({
  candidate,
  userPartyShortName,
  ticketConfig,
  onFollowCandidate,
  onFollowRunningMate,
}: ElectionCandidateRowProps) {
  const partyShort = candidate.party_short_name || "IND";
  const partyLogo = candidate.party_logo;
  const isMyParty = Boolean(
    userPartyShortName &&
      partyShort.toLowerCase() === userPartyShortName.toLowerCase()
  );

  // Principal Candidate
  const candidateName =
    candidate.full_name ||
    `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() ||
    "Candidate";
  const candidateAvatar = candidate.avatar;
  const candidateAgeText = candidate.age
    ? `${candidate.age} years old`
    : "59 years old";
  const candidateStateText = candidate.state
    ? `From ${candidate.state} state`
    : candidate.state_name
      ? `From ${candidate.state_name} state`
      : "From Lagos state";

  // Running Mate
  const runningMateName =
    candidate.running_mate_full_name ||
    `${candidate.running_mate_first_name || ""} ${candidate.running_mate_last_name || ""}`.trim();
  const runningMateAvatar = candidate.running_mate_avatar;
  const hasRunningMate = Boolean(candidate.running_mate_id || runningMateName);
  const runningMateAgeText = candidate.running_mate_age
    ? `${candidate.running_mate_age} years old`
    : "59 years old";
  const runningMateStateText = candidate.running_mate_state
    ? `From ${candidate.running_mate_state} state`
    : candidate.running_mate_state_name
      ? `From ${candidate.running_mate_state_name} state`
      : "From Lagos state";

  return (
    <div
      className={cn(
        "relative rounded-3xl bg-sidebar-softer/70 dark:bg-card border border-sidebar-mobile dark:border-border overflow-hidden transition-shadow shadow-xs hover:shadow-sm",
        isMyParty && "ring-2 ring-primary/40"
      )}
    >
      {/* Top Bar with Flush Inset Tabs for Party & Logo */}
      <div className="flex items-center justify-between">
        {/* Top-Left: Party Name Tab */}
        <div className="rounded-tl-3xl rounded-br-2xl bg-card dark:bg-neutral-900 border-r border-b border-sidebar-mobile dark:border-border px-6 py-3 flex items-center gap-2">
          <span className="font-bold text-lg md:text-xl text-c-90 tracking-tight">
            {partyShort}
          </span>
          {isMyParty && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 border-primary/40 text-primary"
            >
              Your Party
            </Badge>
          )}
        </div>

        {/* Top-Right: Party Logo Tab */}
        <div className="rounded-tr-3xl rounded-bl-2xl bg-card dark:bg-neutral-900 border-l border-b border-sidebar-mobile dark:border-border px-5 py-3 flex items-center justify-center">
          {partyLogo ? (
            <img
              src={partyLogo}
              alt={partyShort}
              className="size-6 object-contain rounded-full"
            />
          ) : (
            <span className="text-xs font-bold text-c-60">{partyShort.slice(0, 3)}</span>
          )}
        </div>
      </div>

      {/* Card Body: Candidates Showcase */}
      <div className="px-3 sm:px-6 pb-6 pt-3 flex items-center justify-around gap-2 sm:gap-6">
        {/* Principal Candidate */}
        <div className="flex-1 flex flex-col items-center text-center max-w-xs w-full">
          <div className="size-24 sm:size-28 md:size-32 rounded-full overflow-hidden shadow-md ring-4 ring-background bg-sidebar-mobile flex items-center justify-center shrink-0">
            {candidateAvatar ? (
              <img
                src={candidateAvatar}
                alt={candidateName}
                className="size-full object-cover"
              />
            ) : (
              <AppAvatar
                src={candidateAvatar}
                alt={candidateName}
                className="size-full text-2xl font-bold"
              />
            )}
          </div>

          <span className="mt-2.5 inline-flex items-center justify-center bg-purple text-white text-[11px] font-semibold px-4 py-0.5 rounded-full shadow-2xs tracking-wide">
            Candidate
          </span>

          <div className="mt-2 bg-card/90 dark:bg-neutral-900/80 border border-border/40 rounded-lg px-3 py-1 text-sm sm:text-base font-bold text-c-90 tracking-tight text-center truncate max-w-full">
            {candidateName}
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-c-50 font-medium">
            <span>{candidateAgeText}</span>
            <span>{candidateStateText}</span>
          </div>

          <button
            type="button"
            onClick={onFollowCandidate}
            className="mt-3 inline-flex items-center justify-center gap-1.5 bg-foreground hover:bg-c-90 text-background font-semibold text-xs px-5 py-1.5 rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Follow</span>
          </button>
        </div>

        {/* Running Mate (if joint ticket office or registered) */}
        {(ticketConfig.hasRunningMate ?? true) && (
          <div className="flex-1 flex flex-col items-center text-center max-w-xs w-full">
            <div className="size-24 sm:size-28 md:size-32 rounded-full overflow-hidden shadow-md ring-4 ring-background bg-sidebar-mobile flex items-center justify-center shrink-0">
              {runningMateAvatar ? (
                <img
                  src={runningMateAvatar}
                  alt={runningMateName || "Running Mate"}
                  className="size-full object-cover"
                />
              ) : (
                <AppAvatar
                  src={runningMateAvatar}
                  alt={runningMateName || "Running Mate"}
                  className="size-full text-2xl font-bold"
                />
              )}
            </div>

            <span className="mt-2.5 inline-flex items-center justify-center bg-[#0052cc] text-white text-[11px] font-semibold px-4 py-0.5 rounded-full shadow-2xs tracking-wide">
              Running mate
            </span>

            <div className="mt-2 bg-card/90 dark:bg-neutral-900/80 border border-border/40 rounded-lg px-3 py-1 text-sm sm:text-base font-bold text-c-90 tracking-tight text-center truncate max-w-full">
              {runningMateName || "No Running Mate"}
            </div>

            <div className="mt-1.5 flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-c-50 font-medium">
              <span>{runningMateAgeText}</span>
              <span>{runningMateStateText}</span>
            </div>

            <button
              type="button"
              onClick={onFollowRunningMate}
              className="mt-3 inline-flex items-center justify-center gap-1.5 bg-foreground hover:bg-c-90 text-background font-semibold text-xs px-5 py-1.5 rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Follow</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

