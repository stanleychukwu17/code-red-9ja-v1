import { Plus } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { WEB_URL } from "#/lib/config";

export type PartyNominationBannerProps = {
  party?: { logo?: string; short_name?: string } | null;
  myPartyCandidate?: any;
  ticketConfig: {
    principalRole: string;
    hasRunningMate?: boolean;
  };
  onManageTicket: () => void;
};

type TicketCandidateProfileProps = {
  avatar?: string;
  name: string;
  username?: string;
  badgeLabel?: string;
  badgeClassName?: string;
  ageText?: string;
  stateText?: string;
  followButtonText?: string;
};

/**
 * Reusable candidate profile card in the nomination showcase banner.
 */
function TicketCandidateProfile({
  avatar,
  name,
  username = "",
  badgeLabel = "Candidate",
  badgeClassName = "bg-purple",
  ageText,
  stateText,
  followButtonText = "Follow",
}: TicketCandidateProfileProps) {
  const profileUrl = WEB_URL.users.profile(encodeURIComponent(username));

  return (
    <div className="flex-1 flex flex-col items-center text-center max-w-xs w-full">
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full transition-transform hover:scale-105"
      >
        <div className="size-24 md:size-28 lg:size-42 rounded-full overflow-hidden shadow-md ring-4 ring-background bg-sidebar-mobile flex items-center justify-center shrink-0">
          <img
            src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=DC2626&color=ffffff`}
            alt={name}
            className="size-full object-cover"
          />
        </div>
      </a>

      <span
        className={cn(
          "mt-2.5 inline-flex items-center justify-center text-white text-[11px] font-semibold px-4 py-0.5 rounded-full shadow-2xs tracking-wide",
          badgeClassName
        )}
      >
        {badgeLabel}
      </span>

      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-base md:text-lg font-bold text-c-90 hover:text-primary tracking-tight text-center max-w-full truncate px-2 transition-colors block"
      >
        <h3 className="truncate">{name}</h3>
      </a>

      <div className="mt-1 flex items-center justify-center gap-4 md:gap-6 text-xs md:text-[13px] text-c-50 font-medium">
        <span>{ageText}</span>
        <span>{stateText}</span>
      </div>

      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3.5 inline-flex items-center justify-center gap-1.5 bg-foreground hover:bg-c-90 text-background font-semibold text-xs md:text-sm px-6 py-2 rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
      >
        <Plus className="size-3.5 stroke-[2.5]" />
        <span>{followButtonText}</span>
      </a>
    </div>
  );
}

/**
 * Party Nomination Banner displaying current fielded ticket status and quick action.
 * Replaced design with 3-column diagonal stripe layout matching candidate showcase.
 */
export function PartyNominationBanner({
  party,
  myPartyCandidate,
  ticketConfig,
  onManageTicket,
}: PartyNominationBannerProps) {
  const partyShort = party?.short_name || "APC";

  // Principal Candidate details
  const candidateName =
    myPartyCandidate?.full_name ||
    `${myPartyCandidate?.first_name || ""} ${myPartyCandidate?.last_name || ""}`.trim();

  const candidateAvatar = myPartyCandidate?.avatar;
  const candidateUsername = myPartyCandidate?.username || "";

  const candidateAgeText = myPartyCandidate?.age
    ? `${myPartyCandidate.age} years old`
    : "59 years old";

  const candidateStateText =
    myPartyCandidate?.state
      ? `From ${myPartyCandidate.state} state`
      : myPartyCandidate?.state_name
        ? `From ${myPartyCandidate.state_name} state`
        : "From Lagos state";

  // Running Mate details
  const runningMateName =
    myPartyCandidate?.running_mate_full_name ||
    `${myPartyCandidate?.running_mate_first_name || ""} ${myPartyCandidate?.running_mate_last_name || ""}`.trim();

  const runningMateAvatar =
    myPartyCandidate?.running_mate_avatar || candidateAvatar;
  const runningMateUsername = myPartyCandidate?.running_mate_username || "";

  const runningMateAgeText = myPartyCandidate?.running_mate_age
    ? `${myPartyCandidate.running_mate_age} years old`
    : "59 years old";

  const runningMateStateText =
    myPartyCandidate?.running_mate_state
      ? `From ${myPartyCandidate.running_mate_state} state`
      : myPartyCandidate?.running_mate_state_name
        ? `From ${myPartyCandidate.running_mate_state_name} state`
        : "From Lagos state";

  return (
    <div className="relative overflow-hidden my-5 rounded-xl border border-sidebar-mobile">
      {/* Subtle diagonal striped background (Light & Dark) */}
      <div
        className="absolute inset-0 pointer-events-none block dark:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #ffffff, #ffffff 18px, #f3f4f6 18px, #f3f4f6 36px)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #141416, #141416 18px, #1e1e24 18px, #1e1e24 36px)",
        }}
      />

      {/* 3-Column Showcase Banner Content */}
      <div className="relative z-10 w-full px-6 py-8 md:py-10 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
        {/* Left: Principal Candidate */}
        <TicketCandidateProfile
          avatar={candidateAvatar}
          name={candidateName}
          username={candidateUsername}
          badgeLabel="Candidate"
          badgeClassName="bg-purple"
          ageText={candidateAgeText}
          stateText={candidateStateText}
        />

        {/* Center: Party Info */}
        <div className="shrink-0 flex flex-col items-center justify-center text-center px-4 md:px-8 order-first md:order-0">
          <h2 className="text-4xl md:text-5xl font-bold text-c-100 tracking-wider">
            {partyShort}
          </h2>

          <div className="my-3 md:my-4 size-14 md:size-16 flex items-center justify-center">
            <img
              src={party?.logo}
              alt={partyShort}
              className="size-full object-contain rounded-full"
            />
          </div>

          <button
            type="button"
            onClick={onManageTicket}
            className={cn(
              "inline-flex items-center justify-center",
              "bg-card hover:bg-hover-5",
              "border border-purple",
              "text-c-90 font-semibold text-xs md:text-sm",
              "mt-5 px-5 py-2 rounded-full transition cursor-pointer"
            )}
          >
            {partyShort} candidates
          </button>
        </div>

        {/* Right: Running Mate */}
        <TicketCandidateProfile
          avatar={runningMateAvatar}
          name={runningMateName}
          username={runningMateUsername}
          badgeLabel="Running mate"
          badgeClassName="bg-[#0052cc]"
          ageText={runningMateAgeText}
          stateText={runningMateStateText}
        />
      </div>
    </div>
  );
}
