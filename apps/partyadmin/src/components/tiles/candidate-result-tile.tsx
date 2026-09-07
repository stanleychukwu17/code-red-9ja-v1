import { AppAvatar } from "@repo/ui/components/avatar";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { cn } from "@repo/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

// ─── Percentage Formatter ────────────────────────────────────────────────────
/** Shows 1 decimal place only when non-zero (e.g. 35.4 → "35.4", 35.0 → "35") */
export function formatPct(val: number): string {
  const fixed = val.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

// ─── Party Color Helper ───────────────────────────────────────────────────────
export function getPartyColor(
  partyShortName?: string,
  index: number = 0,
): string {
  const short = partyShortName?.toUpperCase().trim();
  switch (short) {
    case "APC":
      return "#0099FF"; // Sky Blue
    case "PDP":
      return "#008751"; // Green
    case "LP":
      return "#00A859"; // Green
    case "NNPP":
      return "#122A5E"; // Deep Blue
    case "APGA":
      return "#008751"; // Green
    case "SDP":
      return "#E31B23"; // Red
    case "ADC":
      return "#144673"; // Navy Blue
    case "YPP":
      return "#800080"; // Purple
    case "AAC":
      return "#E65100"; // Orange
    case "PRP":
      return "#8B0000"; // Crimson
    default: {
      const palette = [
        "#0099FF",
        "#008751",
        "#00A859",
        "#122A5E",
        "#E31B23",
        "#144673",
        "#800080",
      ];
      return palette[index % palette.length] ?? "#0099FF";
    }
  }
}

export function getPartyDarkColor(
  partyShortName?: string,
  index: number = 0,
): string {
  const short = partyShortName?.toUpperCase().trim();
  switch (short) {
    case "APC":
      return "#33ADFF";
    case "PDP":
      return "#00A86B";
    case "LP":
      return "#2ECC71";
    case "NNPP":
      return "#1F478B";
    case "APGA":
      return "#00B36B";
    case "SDP":
      return "#FF3B30";
    case "ADC":
      return "#20639B";
    case "YPP":
      return "#993399";
    case "AAC":
      return "#FF6D00";
    case "PRP":
      return "#A52A2A";
    default: {
      const palette = [
        "#33ADFF",
        "#00A86B",
        "#2ECC71",
        "#1F478B",
        "#FF3B30",
        "#20639B",
        "#993399",
      ];
      return palette[index % palette.length] ?? "#33ADFF";
    }
  }
}

// ─── Vote Share / Leading Progress Bar ─────────────────────────────────────────
export function CandidateVoteShareBar({
  percentage,
  color,
  darkColor,
}: {
  percentage: number;
  color: string;
  darkColor?: string;
}) {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  return (
    <div className="relative w-[130px] h-6 rounded-xs bg-c-10 dark:bg-c-20 overflow-hidden flex items-center shrink-0">
      <div
        className="absolute left-0 top-0 bottom-0 transition-all duration-500 rounded-xs bg-[var(--bar-color)] dark:bg-[var(--bar-dark-color,var(--bar-color))]"
        style={
          {
            width: `${clampedPct}%`,
            "--bar-color": color,
            "--bar-dark-color": darkColor || color,
          } as React.CSSProperties
        }
      />
      <span className="relative z-10 ml-auto pr-2 text-[14px] text-c-90">
        {formatPct(clampedPct)}%
      </span>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type CandidateSummary = {
  party_short_name: string;
  party_name?: string;
  candidate_name: string;
  candidate_avatar?: string;
  party_logo?: string;
  party_color_hex?: string;
  party_dark_color_hex?: string;
  vote_count: number;
  votes?: number;
  percentage: number;
  is_winner?: boolean;
  [key: string]: any;
};

export type CandidateEntity = {
  id: number;
  name: string;
  avatar?: string;
};

export type PartyEntity = {
  id: number;
  short_name: string;
  name: string;
  logo?: string;
  color_hex?: string;
  dark_color_hex?: string;
};

export type CandidateResultItem = {
  candidate?: CandidateEntity | null;
  candidate_name?: string;
  candidate_avatar?: string;
  party?: PartyEntity | null;
  party_name?: string;
  party_short_name?: string;
  party_logo?: string;
  color_hex?: string;
  dark_color_hex?: string;
  party_color_hex?: string;
  party_dark_color_hex?: string;
  states_winning_count?: number;
  senatorial_districts_winning_count?: number;
  federal_constituencies_winning_count?: number;
  lgas_winning_count?: number;
  state_constituency_winning_count?: number;
  wards_winning_count?: number;
  polling_units_winning_count?: number;
  vote_count?: number;
  vote_share?: number;
  votes?: number;
  percentage?: number;
  rank?: number;
  name?: string;
  avatar?: string;
  [key: string]: any;
};

export type ElectoralUnitItem = {
  id: number | string;
  name: string;
  code?: string;
  accredited_voters?: number;
  votes_cast?: number;
  valid_votes?: number;
  rejected_votes?: number;
  sub_units_counted?: number;
  total_sub_units?: number;
  total_valid_votes?: number;
  leading_candidate_name?: string;
  leading_candidate_avatar?: string;
  leading_party_short_name?: string;
  leading_party_color_hex?: string;
  leading_party_dark_color_hex?: string;
  leading_votes?: number;
  leading_percentage?: number;
  vote_count?: number;
  percentage?: number;
  candidate_results?: CandidateResultItem[];
  candidate_results_live?: CandidateResultItem[];
  [key: string]: any;
};

// ─── Candidate Results Table (Image 1) ────────────────────────────────────────
export function CandidateResultTableHeader() {
  return (
    <TileHeader className="min-w-max px-4">
      <div className="flex items-center gap-3 w-[280px] flex-1">
        <span className="w-8 text-c-50 text-[14px] shrink-0">#</span>
        <span className="text-c-50 text-[14px] font-medium">User</span>
      </div>
      <TileRight className="min-w-fit gap-4 items-center">
        <span className="text-c-50 text-[14px] w-[100px]">States Wining</span>
        <span className="text-c-50 text-[14px] w-[110px]">
          Districts Wining
        </span>
        <span className="text-c-50 text-[14px] w-[130px]">
          Federal C. Wining
        </span>
        <span className="text-c-50 text-[14px] w-[90px]">LGA Wining</span>
        <span className="text-c-50 text-[14px] w-[110px]">State C. Wining</span>
        <span className="text-c-50 text-[14px] w-[100px]">Ward Wining</span>
        <span className="text-c-50 text-[14px] w-[100px]">PU Wining</span>
        <span className="text-c-50 text-[14px] w-[100px] text-right">
          Votes
        </span>
        <span className="text-c-50 text-[14px] w-[160px] text-right pr-2">
          Vote share
        </span>
      </TileRight>
    </TileHeader>
  );
}

export function getCandidateDisplayInfo(
  data: CandidateResultItem,
  index: number = 0,
) {
  const partyShort = data.party_short_name || data.party?.short_name || "";
  const partyFullName = data.party?.name || data.party_name || partyShort || "";

  const fallbackColor = getPartyColor(partyShort, index);
  const fallbackDarkColor = getPartyDarkColor(partyShort, index);
  const color =
    data.color_hex ||
    data.party?.color_hex ||
    data.party_color_hex ||
    fallbackColor;
  const darkColor =
    data.dark_color_hex ||
    data.party?.dark_color_hex ||
    data.party_dark_color_hex ||
    fallbackDarkColor;

  const hasCandidate =
    data.candidate !== undefined
      ? Boolean(data.candidate && data.candidate.name?.trim())
      : Boolean(
          data.candidate_name?.trim() &&
          data.candidate_name?.trim() !== partyFullName &&
          data.candidate_name?.trim() !== partyShort,
        );

  const rawCandidateName = hasCandidate
    ? data.candidate?.name?.trim() || data.candidate_name?.trim() || ""
    : "";

  const hasPartySuffix =
    partyShort && rawCandidateName.endsWith(`(${partyShort})`);
  const cleanCandidateName = hasPartySuffix
    ? rawCandidateName.slice(0, -`(${partyShort})`.length).trim()
    : rawCandidateName;

  const displayName = hasCandidate
    ? cleanCandidateName
    : partyShort || partyFullName || data.name || "-";

  const avatar =
    data.candidate?.avatar ||
    data.candidate_avatar ||
    data.party?.logo ||
    data.party_logo ||
    data.avatar ||
    "";

  const votes = Number(data.vote_count ?? data.votes ?? 0);
  const percentage = Number(data.vote_share ?? data.percentage ?? 0);
  const rank = data.rank ?? index + 1;

  return {
    displayName,
    hasCandidate,
    partyShort,
    partyFullName,
    avatar,
    color,
    darkColor,
    votes,
    percentage,
    rank,
  };
}

export function CandidateResultTableTile({
  data,
  index,
}: {
  data: CandidateResultItem;
  index: number;
}) {
  const {
    displayName,
    hasCandidate,
    partyShort,
    avatar,
    color,
    darkColor,
    votes,
    percentage,
    rank,
  } = getCandidateDisplayInfo(data, index);

  return (
    <TileRow className="min-w-max py-3 px-4 border-b border-border/60 hover:bg-c-5/60 transition-colors">
      <div className="flex items-center gap-3 w-[280px] flex-1">
        <span className="w-8 text-c-50 text-[14px] font-medium shrink-0">
          #{rank}
        </span>
        <AppAvatar
          src={avatar}
          alt={displayName}
          className="size-10 shrink-0 rounded-full"
        />
        <span className="text-[15px] text-c-90 truncate">
          {displayName}
          {hasCandidate && partyShort && (
            <span className="text-c-60 ml-1.5 font-normal">({partyShort})</span>
          )}
        </span>
      </div>
      <TileRight className="min-w-fit gap-4 items-center text-[14px] text-c-70">
        <span className="w-[100px]">
          {data.states_winning_count?.toLocaleString() ?? 0}
        </span>
        <span className="w-[110px]">
          {data.senatorial_districts_winning_count?.toLocaleString() ?? 0}
        </span>
        <span className="w-[130px]">
          {data.federal_constituencies_winning_count?.toLocaleString() ?? 0}
        </span>
        <span className="w-[90px]">
          {data.lgas_winning_count?.toLocaleString() ?? 0}
        </span>
        <span className="w-[110px]">
          {data.state_constituency_winning_count?.toLocaleString() ?? 0}
        </span>
        <span className="w-[100px]">
          {data.wards_winning_count?.toLocaleString() ?? 0}
        </span>
        <span className="w-[100px]">
          {data.polling_units_winning_count?.toLocaleString() ?? 0}
        </span>
        <span className="w-[100px] text-right text-[15px] text-c-90">
          {votes.toLocaleString()}
        </span>
        <div className="w-[160px] flex justify-end">
          <CandidateVoteShareBar
            percentage={percentage}
            color={color}
            darkColor={darkColor}
          />
        </div>
      </TileRight>
    </TileRow>
  );
}

// ─── Electoral Units Table (Image 2) ──────────────────────────────────────────
export function ElectoralUnitTableHeader({
  unitTitle = "States",
  isDrillable = true,
}: {
  unitTitle?: string;
  isDrillable?: boolean;
}) {
  return (
    <TileHeader className="min-w-max px-4">
      <TileLeft className="min-w-[200px] flex-1">
        <span className="text-c-90 text-[15px]">{unitTitle}</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-8 items-center">
        <span className="text-c-50 text-[14px] min-w-[280px]">
          Candidates leading
        </span>
        <span className="text-c-50 text-[14px] w-[120px] text-right">
          Votes
        </span>
        <span className="text-c-50 text-[14px] w-[130px] text-right pr-2">
          Vote share
        </span>
        {isDrillable && <span className="w-5" />}
      </TileRight>
    </TileHeader>
  );
}

export function ElectoralUnitTableTile({
  data,
  index,
  isLive = false,
  onClick,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  data: ElectoralUnitItem;
  index: number;
  isLive?: boolean;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}) {
  const candResults =
    isLive &&
    data.candidate_results_live &&
    data.candidate_results_live.length > 0
      ? data.candidate_results_live
      : data.candidate_results && data.candidate_results.length > 0
        ? data.candidate_results
        : [];
  const topCand = candResults.length > 0 ? candResults[0] : null;

  const partyShort =
    topCand?.party_short_name ||
    topCand?.party?.short_name ||
    data.leading_party_short_name ||
    "";
  const partyFullName =
    topCand?.party?.name || topCand?.party_name || partyShort || "";

  const fallbackColor = getPartyColor(partyShort, index);
  const fallbackDarkColor = getPartyDarkColor(partyShort, index);
  const color =
    (isLive
      ? topCand?.color_hex ||
        topCand?.party?.color_hex ||
        data.leading_party_color_hex
      : data.leading_party_color_hex ||
        topCand?.color_hex ||
        topCand?.party?.color_hex) || fallbackColor;
  const darkColor =
    (isLive
      ? topCand?.dark_color_hex ||
        topCand?.party?.dark_color_hex ||
        data.leading_party_dark_color_hex
      : data.leading_party_dark_color_hex ||
        topCand?.dark_color_hex ||
        topCand?.party?.dark_color_hex) || fallbackDarkColor;

  const hasCandidate =
    topCand?.candidate !== undefined
      ? Boolean(topCand?.candidate && topCand.candidate.name?.trim())
      : Boolean(
          (topCand?.candidate_name?.trim() ||
            data.leading_candidate_name?.trim()) &&
          (topCand?.candidate_name?.trim() ||
            data.leading_candidate_name?.trim()) !== partyFullName &&
          (topCand?.candidate_name?.trim() ||
            data.leading_candidate_name?.trim()) !== partyShort,
        );

  const rawCandidateName = hasCandidate
    ? topCand?.candidate?.name?.trim() ||
      topCand?.candidate_name?.trim() ||
      data.leading_candidate_name?.trim() ||
      ""
    : "";

  const hasPartySuffix =
    partyShort && rawCandidateName.endsWith(`(${partyShort})`);
  const cleanCandidateName = hasPartySuffix
    ? rawCandidateName.slice(0, -`(${partyShort})`.length).trim()
    : rawCandidateName;

  const displayName = hasCandidate
    ? cleanCandidateName
    : partyShort || partyFullName || data.leading_candidate_name || "-";

  const avatar =
    topCand?.candidate?.avatar ||
    topCand?.candidate_avatar ||
    data.leading_candidate_avatar ||
    topCand?.party?.logo ||
    topCand?.party_logo ||
    "";

  const votes = Number(
    isLive
      ? (topCand?.vote_count ??
          topCand?.votes ??
          data.leading_votes ??
          data.vote_count ??
          0)
      : (data.leading_votes ??
          topCand?.vote_count ??
          topCand?.votes ??
          data.vote_count ??
          0),
  );

  const percentage = Number(
    isLive
      ? (topCand?.percentage ??
          topCand?.vote_share ??
          data.leading_percentage ??
          data.percentage ??
          0)
      : (data.leading_percentage ??
          topCand?.percentage ??
          topCand?.vote_share ??
          data.percentage ??
          0),
  );

  return (
    <TileRow
      className={cn(
        "group min-w-max py-3 px-4 border-b border-border/60 hover:bg-c-5/60 transition-colors select-none",
        onClick && "cursor-pointer hover:border-border active:bg-c-10/60",
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <TileLeft className="min-w-[200px] flex-1">
        <span className="text-[15px] text-c-90 truncate">{data.name}</span>
      </TileLeft>
      <TileRight className="min-w-fit gap-8 items-center text-[14px]">
        <div className="min-w-[280px] flex items-center gap-3">
          <AppAvatar
            src={avatar}
            alt={displayName}
            className="size-10 shrink-0 rounded-full border border-neutral-200/60 dark:border-neutral-700/60"
          />
          <span className="text-[15px] font-medium text-c-90 truncate">
            {displayName}
            {hasCandidate && partyShort && (
              <span className="text-c-60 ml-1.5 font-normal">
                ({partyShort})
              </span>
            )}
          </span>
        </div>
        <span className="w-[120px] text-right text-[15px] text-c-90">
          {votes.toLocaleString()}
        </span>
        <div className="w-[130px] flex justify-end">
          <CandidateVoteShareBar
            percentage={percentage}
            color={color}
            darkColor={darkColor}
          />
        </div>
        {onClick ? (
          <div className="w-5 flex justify-end">
            <ChevronRight className="size-4 text-c-40 group-hover:text-c-90 group-hover:translate-x-0.5 transition-all" />
          </div>
        ) : null}
      </TileRight>
    </TileRow>
  );
}

// ─── Candidate Leaderboard Tile (Overview Page) ───────────────────────────────
export function CandidateLeaderboardTile({
  data,
  index,
  leadingMetric,
  sharePercentage,
}: {
  data: CandidateResultItem;
  index: number;
  leadingMetric: { primary: string; secondary?: string };
  sharePercentage?: number;
}) {
  const {
    displayName,
    hasCandidate,
    partyShort,
    partyFullName,
    avatar,
    color,
    percentage,
  } = getCandidateDisplayInfo(data, index);

  const displayPct =
    typeof sharePercentage === "number" ? sharePercentage : percentage;
  const clampedPct = Math.min(100, Math.max(0, displayPct));
  const isLeader = index === 0 && displayPct > 0;

  return (
    <TileRow className="relative min-w-max h-auto py-3 px-4 border-b border-border/60 hover:bg-c-5/40 transition-colors select-none overflow-hidden justify-between cursor-default">
      {/* Subject share background fill bar reflecting the percentage */}
      <div
        className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 opacity-15 dark:opacity-20"
        style={{
          width: `${clampedPct}%`,
          backgroundColor: color,
        }}
      />

      {/* Left solid vertical party accent bar */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1.5 z-10 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      {/* Candidate Avatar & Info */}
      <div className="relative z-10 flex items-center gap-3.5 w-1/2 sm:w-2/5 min-w-0 pl-1.5">
        <AppAvatar
          src={avatar}
          alt={displayName}
          className="size-10 sm:size-11 rounded-full object-cover shrink-0 border border-border"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-c-90 truncate leading-tight">
            {displayName}
          </p>
          <p className="text-[13px] font-medium text-c-50 truncate leading-tight mt-1">
            {hasCandidate
              ? partyShort
              : partyFullName !== partyShort
                ? partyFullName
                : partyShort}
          </p>
        </div>
      </div>

      {/* Center Share Percentage */}
      <div className="relative z-10 w-1/4 text-center">
        <span
          className={cn(
            "text-base tracking-tight",
            isLeader
              ? "font-bold text-c-90"
              : "font-medium text-neutral-400 dark:text-neutral-500",
          )}
        >
          {formatPct(displayPct)}%
        </span>
      </div>

      {/* Right Leading Metric */}
      <div className="relative z-10 w-1/4 sm:w-1/3 text-right flex flex-col items-end">
        <span className="text-[14px] font-semibold text-c-90 leading-tight">
          {leadingMetric.primary}
        </span>
        {leadingMetric.secondary && (
          <span className="text-[13px] text-c-50 dark:text-neutral-400 leading-tight mt-1">
            {leadingMetric.secondary}
          </span>
        )}
      </div>
    </TileRow>
  );
}
