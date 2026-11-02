import { AppAvatar } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";

export type ElectionCandidateRowProps = {
  candidate: any;
  ticketConfig: {
    principalRole: string;
    hasRunningMate?: boolean;
  };
};

type CandidateProfileProps = {
  avatar?: string;
  name: string;
  badgeLabel: string;
  badgeClassName?: string;
  ageText?: string;
  stateText?: string;
};

/**
 * Reusable candidate/running mate column inside the showcase card.
 */
function CandidateProfile({
  avatar,
  name,
  badgeLabel,
  badgeClassName,
  ageText,
  stateText,
}: CandidateProfileProps) {
  return (
    <div className="flex-1 flex flex-col items-center text-center max-w-xs w-full">
      <div className="size-24 sm:size-28 md:size-32 rounded-full overflow-hidden shadow-md ring-4 ring-background bg-sidebar-mobile flex items-center justify-center shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="size-full object-cover"
          />
        ) : (
          <AppAvatar
            src={avatar}
            alt={name}
            className="size-full text-2xl font-bold"
          />
        )}
      </div>

      <span
        className={cn(
          "mt-2.5 inline-flex items-center justify-center text-white text-[11px] font-semibold px-4 py-0.5 rounded-full shadow-2xs tracking-wide",
          badgeClassName
        )}
      >
        {badgeLabel}
      </span>

      <div className="mt-2 bg-sidebar-mobile dark:bg-neutral-900/80 border border-border/40 rounded-lg px-3 py-1 text-sm sm:text-base font-bold text-c-90 tracking-tight text-center truncate max-w-full">
        {name}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-c-50 font-medium">
        <span>{ageText}</span>
        <span>{stateText}</span>
      </div>
    </div>
  );
}

/**
 * Candidate Showcase Card displaying party header (name & logo) and fielded
 * candidates (principal candidate and running mate) matching the ticket showcase design.
 */
export function ElectionCandidateRow({
  candidate,
  ticketConfig,
}: ElectionCandidateRowProps) {
  const partyShort = candidate.party_short_name || "IND";
  const partyLogo = candidate.party_logo;

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
    <div className="relative my-7 mx-2 bg-sidebar-softer/40 dark:bg-card transition-shadow hover:shadow-xs">
      {/* Top Bar with Flush Inset Tabs for Party & Logo */}
      <div className="flex items-center justify-between absolute w-full -top-11.5">
        {/* Top-Left: Party Name Tab */}
        <div
          className={cn(
            "rounded-3xl rounded-br-none rounded-bl-none",
            "bg-sidebar-softer/40 dark:bg-neutral-900",
            "px-6 py-3 flex items-center gap-2"
          )}
        >
          <span className="font-bold text-md md:text-md text-c-90 tracking-tight">
            {partyShort}
          </span>
        </div>

        {/* Top-Right: Party Logo Tab */}
        <div
          className={cn(
            "rounded-3xl rounded-br-none rounded-bl-none",
            "bg-sidebar-softer/40 dark:bg-neutral-900",
            "px-5 py-3 flex items-center justify-center"
          )}
        >
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
        <CandidateProfile
          avatar={candidateAvatar}
          name={candidateName}
          badgeLabel="Candidate"
          badgeClassName="bg-purple"
          ageText={candidateAgeText}
          stateText={candidateStateText}
        />

        {/* Running Mate (if joint ticket office or registered) */}
        {(ticketConfig.hasRunningMate ?? true) && (
          <CandidateProfile
            avatar={runningMateAvatar}
            name={runningMateName || "No Running Mate"}
            badgeLabel="Running mate"
            badgeClassName="bg-[#0052cc]"
            ageText={runningMateAgeText}
            stateText={runningMateStateText}
          />
        )}
      </div>
    </div>
  );
}
