import { AppAvatar } from "@repo/ui/components/avatar";
import {
  HeaderTabs,
  Layout,
  PageHeader,
} from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useAppContext } from "#/hooks/useAppContext";
import { getScopedElectionResult } from "#/lib/server/election-results";
import { getPageHeader } from "#/lib/shared/meta";
import {
  formatPct,
  type CandidateResultItem,
  getCandidateDisplayInfo,
  CandidateLeaderboardTile,
} from "#/components/tiles/candidate-result-tile";
import { ElectionRaceHeaderRight } from "./-components";
import { getElectionRaceTabs } from "./-data";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/election-race/",
)({
  head: () => getPageHeader({ title: "Electoral Race In Nigeria" }),
  component: OverviewPage,
});

type TabType =
  | "general"
  | "states"
  | "district"
  | "fedConst"
  | "lgas"
  | "stateConst"
  | "wards"
  | "pollingUnits";

interface TabDefinition {
  id: TabType;
  label: string;
}

const SCOPE_TABS: TabDefinition[] = [
  { id: "general", label: "General" },
  { id: "states", label: "States" },
  { id: "district", label: "District" },
  { id: "fedConst", label: "Federal C." },
  { id: "lgas", label: "LGAs" },
  { id: "stateConst", label: "State C." },
  { id: "wards", label: "Wards" },
  { id: "pollingUnits", label: "Polling units" },
];

function formatDiff(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1);
    return `${val.endsWith(".0") ? val.slice(0, -2) : val}m`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1);
    return `${val.endsWith(".0") ? val.slice(0, -2) : val}k`;
  }
  return abs.toLocaleString();
}

function getTabValue(cand: CandidateResultItem, tab: TabType): number {
  switch (tab) {
    case "states":
      return Number(cand.states_winning_count ?? 0);
    case "district":
      return Number(cand.senatorial_districts_winning_count ?? 0);
    case "fedConst":
      return Number(cand.federal_constituencies_winning_count ?? 0);
    case "lgas":
      return Number(cand.lgas_winning_count ?? 0);
    case "stateConst":
      return Number(cand.state_constituency_winning_count ?? 0);
    case "wards":
      return Number(cand.wards_winning_count ?? 0);
    case "pollingUnits":
      return Number(cand.polling_units_winning_count ?? 0);
    default:
      return Number(cand.vote_count ?? cand.votes ?? 0);
  }
}

function getTabUnitLabel(tab: TabType, count: number): string {
  switch (tab) {
    case "states":
      return count === 1 ? "state" : "states";
    case "district":
      return count === 1 ? "district" : "districts";
    case "fedConst":
    case "stateConst":
      return count === 1 ? "constituency" : "constituencies";
    case "lgas":
      return count === 1 ? "LGA" : "LGAs";
    case "wards":
      return count === 1 ? "ward" : "wards";
    case "pollingUnits":
      return count === 1 ? "polling unit" : "polling units";
    default:
      return count === 1 ? "vote" : "votes";
  }
}

function getTabShareTitle(tab: TabType): string {
  switch (tab) {
    case "states":
      return "State Share";
    case "district":
      return "District Share";
    case "fedConst":
      return "Federal C. Share";
    case "lgas":
      return "LGA Share";
    case "stateConst":
      return "State C. Share";
    case "wards":
      return "Ward Share";
    case "pollingUnits":
      return "PU Share";
    default:
      return "Vote Share";
  }
}

interface HeadToHeadHeroProps {
  cand1: CandidateResultItem;
  cand2: CandidateResultItem;
  cand1HeadPct: number;
  cand2HeadPct: number;
  diffText: string;
  partyShortName: string;
}

function HeadToHeadHero({
  cand1,
  cand2,
  cand1HeadPct,
  cand2HeadPct,
  diffText,
  partyShortName,
}: HeadToHeadHeroProps) {
  const info1 = getCandidateDisplayInfo(cand1, 0);
  const info2 = getCandidateDisplayInfo(cand2, 1);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex items-center justify-between gap-4 sm:gap-6">
        {/* Candidate 1 Avatar (Left) */}
        <div className="shrink-0 flex flex-col items-center">
          <AppAvatar
            src={info1.avatar}
            alt={info1.displayName}
            className="size-[148px] md:size-36 border border-border"
          />
        </div>

        {/* Comparison Dual Bar in Center */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Names and Party Labels */}
          <div className="flex items-end justify-between gap-2">
            <div className="text-left min-w-0">
              <h2 className="text-lg md:text-xl font-medium text-c-80 truncate">
                {info1.displayName}
              </h2>
              <span
                className="text-sm md:text-base font-medium"
                style={{ color: info1.color }}
              >
                {info1.partyShort}
              </span>
            </div>

            <div className="text-right min-w-0">
              <h2 className="text-lg md:text-xl font-medium text-c-80 truncate">
                {info2.displayName}
              </h2>
              <span
                className="text-sm md:text-base font-medium"
                style={{ color: info2.color }}
              >
                {info2.partyShort}
              </span>
            </div>
          </div>

          {/* Segmented Dual Bar with Center Diff Marker */}
          <div className="relative w-full h-12 sm:h-16 bg-neutral-100 dark:bg-neutral-800 rounded-sm overflow-visible flex items-stretch">
            {/* Cand 1 Segment */}
            <div
              className="h-full flex items-center justify-start transition-all duration-700 select-none overflow-hidden"
              style={{
                width: `${cand1HeadPct}%`,
                backgroundColor: info1.color,
              }}
            >
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-white px-4">
                {formatPct(cand1HeadPct)}%
              </span>
            </div>

            {/* Center Divider & Difference Text */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20">
              <span className="whitespace-nowrap text-xs md:text-sm font-medium text-c-80">
                {diffText}
              </span>
              <div className="h-[72px] w-[2px] bg-c-80" />
            </div>

            {/* Cand 2 Segment */}
            <div
              className="h-full flex items-center justify-end transition-all duration-700 select-none overflow-hidden"
              style={{
                width: `${cand2HeadPct}%`,
                backgroundColor: info2.color,
              }}
            >
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-white px-4">
                {formatPct(cand2HeadPct)}%
              </span>
            </div>
          </div>

          {/* Vote Counts below bar */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-c-80">
            <span>{info1.votes.toLocaleString()} votes</span>
            <span>{info2.votes.toLocaleString()} votes</span>
          </div>
        </div>

        {/* Candidate 2 Avatar (Right) */}
        <div className="shrink-0 flex flex-col items-center">
          <AppAvatar
            src={info2.avatar}
            alt={info2.displayName}
            className="size-[148px] md:size-36 border border-border"
          />
        </div>
      </div>

      {/* "See details" Link */}
      <div className="mt-5 text-center">
        <Link
          to="/$partyShortName/election-race/candidates"
          params={{ partyShortName }}
          className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100 underline underline-offset-4 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        >
          See details
        </Link>
      </div>
    </div>
  );
}

interface CandidateLeaderboardProps {
  candidates: CandidateResultItem[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

function CandidateLeaderboard({
  candidates,
  activeTab,
  setActiveTab,
}: CandidateLeaderboardProps) {
  // Sort candidates based on active tab's metric descending, tie-breaking by votes
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const valA = getTabValue(a, activeTab);
      const valB = getTabValue(b, activeTab);
      if (valB !== valA) return valB - valA;
      return (
        Number(b.vote_count ?? b.votes ?? 0) -
        Number(a.vote_count ?? a.votes ?? 0)
      );
    });
  }, [candidates, activeTab]);

  // Total denominator across all candidates for active tab's metric
  const totalTabMetric = useMemo(() => {
    if (activeTab === "general") {
      return candidates.reduce(
        (sum, c) => sum + (Number(c.vote_count ?? c.votes) || 0),
        0,
      );
    }
    return candidates.reduce((sum, c) => sum + getTabValue(c, activeTab), 0);
  }, [candidates, activeTab]);

  const getLeadingMetric = (cand: CandidateResultItem, index: number) => {
    const nextCand = sortedCandidates[index + 1];
    const val = getTabValue(cand, activeTab);
    const nextVal = nextCand ? getTabValue(nextCand, activeTab) : 0;
    const diff = val - nextVal;

    if (activeTab === "general") {
      return {
        primary: `${val.toLocaleString()} votes`,
        secondary:
          nextCand && diff >= 0 ? `${formatDiff(diff)} ahead` : undefined,
      };
    }

    const unitLabel = getTabUnitLabel(activeTab, val);
    return {
      primary: `${val.toLocaleString()} ${unitLabel}`,
      secondary:
        nextCand && diff >= 0 ? `${diff.toLocaleString()} ahead` : undefined,
    };
  };

  const getSharePercentage = (cand: CandidateResultItem) => {
    const val = getTabValue(cand, activeTab);
    if (activeTab === "general") {
      return totalTabMetric > 0
        ? (val / totalTabMetric) * 100
        : Number(cand.vote_share ?? cand.percentage ?? 0);
    }
    return totalTabMetric > 0 ? (val / totalTabMetric) * 100 : 0;
  };

  const shareTitle = getTabShareTitle(activeTab);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Scope Filter Tabs using HeaderTabs */}
      <div className="w-full flex justify-center mt-12 mb-6">
        <HeaderTabs
          activeTab={activeTab}
          tabs={SCOPE_TABS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            onClick: () => setActiveTab(tab.id),
          }))}
          activeTabClassName="bg-[#222] text-white shadow-sm"
          containerClassName="h-10"
        />
      </div>

      {/* Leaderboard Table */}
      <div className="w-full max-w-3xl border-t border-border">
        {/* Table Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border text-sm text-c-80">
          <span className="w-1/2 sm:w-2/5">Candidate</span>
          <span className="w-1/4 text-center">{shareTitle}</span>
          <span className="w-1/4 sm:w-1/3 text-right">Leading</span>
        </div>

        {/* Candidate Tiles */}
        <div>
          {sortedCandidates.map((cand, idx) => (
            <CandidateLeaderboardTile
              key={`${cand.party_short_name || cand.party?.short_name || idx}-${idx}`}
              data={cand}
              index={idx}
              sharePercentage={getSharePercentage(cand)}
              leadingMetric={getLeadingMetric(cand, idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewPage() {
  const { partyShortName } = Route.useParams();
  const { selectedElection, isLive, setIsLive } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>("general");

  const fetchScopedResult = useServerFn(getScopedElectionResult);

  // Fetch national final results
  const { data, isLoading } = useQuery({
    queryKey: ["election-race-overview", selectedElection?.id, isLive],
    queryFn: async () => {
      if (!selectedElection?.id) return null;
      return fetchScopedResult({
        data: {
          electionId: selectedElection.id,
        },
      });
    },
    enabled: !!selectedElection?.id,
    refetchInterval: isLive ? 15000 : false,
  });

  const finalResult =
    (data as any)?.data?.final_result || (data as any)?.final_result;
  const rawList: CandidateResultItem[] =
    (isLive && finalResult?.candidate_results_live?.length
      ? finalResult.candidate_results_live
      : finalResult?.candidate_results) ?? [];

  const candidates: CandidateResultItem[] = useMemo(() => {
    return [...rawList].sort(
      (a, b) =>
        Number(b.vote_count ?? b.votes ?? 0) -
        Number(a.vote_count ?? a.votes ?? 0),
    );
  }, [rawList]);

  // Top 2 candidates for the comparison hero
  const cand1 = candidates[0];
  const cand2 = candidates[1];

  const { cand1HeadPct, cand2HeadPct, diffText } = useMemo(() => {
    if (!cand1 || !cand2) {
      return { cand1HeadPct: 50, cand2HeadPct: 50, diffText: "0 diff" };
    }
    const v1 = Number(cand1.vote_count ?? cand1.votes ?? 0);
    const v2 = Number(cand2.vote_count ?? cand2.votes ?? 0);
    const sumVotes = v1 + v2;
    const p1 =
      sumVotes > 0 ? parseFloat(((v1 / sumVotes) * 100).toFixed(1)) : 50;
    const p2 = parseFloat((100 - p1).toFixed(1));
    const diff = Math.abs(v1 - v2);
    return {
      cand1HeadPct: p1,
      cand2HeadPct: p2,
      diffText: `${formatDiff(diff)} diff`,
    };
  }, [cand1, cand2]);

  const electionTitle =
    selectedElection?.name?.toUpperCase() || "PRESIDENTIAL ELECTION";

  return (
    <Layout>
      <PageHeader
        title="Electoral Race"
        activeTab="overview"
        tabs={getElectionRaceTabs(partyShortName)}
        rightComponent={
          <ElectionRaceHeaderRight isLive={isLive} setIsLive={setIsLive} />
        }
      />

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col items-center">
        {isLoading ? (
          <div className="py-24 text-center text-c-50 text-[15px]">
            Loading election race data...
          </div>
        ) : !selectedElection?.id ? (
          <div className="py-24 text-center text-c-50 text-[15px]">
            Please select an active election to view the race.
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-24 text-center text-c-50 text-[15px]">
            No candidate results reported for this election yet.
          </div>
        ) : (
          <div className="w-full space-y-12 py-12">
            <h1 className="text-2xl md:text-[32px] font-bold text-center uppercase text-c-90">
              {electionTitle}
            </h1>

            {/* Top 2 Head-to-Head Hero Comparison */}
            {cand1 && cand2 && (
              <HeadToHeadHero
                cand1={cand1}
                cand2={cand2}
                cand1HeadPct={cand1HeadPct}
                cand2HeadPct={cand2HeadPct}
                diffText={diffText}
                partyShortName={partyShortName}
              />
            )}

            {/* Scope Filter Tabs & Leaderboard Table */}
            <CandidateLeaderboard
              candidates={candidates}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
