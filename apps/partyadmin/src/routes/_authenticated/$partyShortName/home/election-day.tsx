import {
  getPollingUnitUpdates,
  getPollingUnitFinalResults,
  getElectionStats,
} from "#/lib/server/elections";
import { getElectionScopedFinalResult } from "#/lib/server/final-results";
import { mergeElectionResults } from "@repo/ui/lib/merge-election-results";
import { FinalResultReel } from "./components/-final-result-reel";
import { UpdateReel } from "./components/-update-reel";
import { getPageHeader } from "#/lib/shared/meta";
import { useAppContext } from "#/hooks/useAppContext";
import { Button } from "@repo/ui/components/button";
import { ActivitiesCard } from "@repo/ui/components/cards/activities-card";
import { ElectionStatsSidebar } from "@repo/ui/components/cards/election-stats-sidebar";
import {
  LeaderboardCardRow,
  LeaderboardCardWrapper,
} from "@repo/ui/components/cards/leaderboard-card";
import { DashboardLayout } from "@repo/ui/components/custom/AdminLayouts";
import ReportCubeIcon from "@repo/ui/icons/report-cube-icon";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { ElectionScopeSelector } from "./components/-election-scope-selector";
import { HomePageHeader } from "./-header";
import { InfoCard } from "@repo/ui/components/cards/Rewards";
import AlertIcon from "@repo/ui/icons/alert-icon";
import { cn } from "@repo/ui/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/election-day",
)({
  head: () => getPageHeader({ title: "Election Day Dashboard" }),
  component: ElectionDayComponent,
});

// Returns true if today matches electionDate (YYYY-MM-DD)
function isElectionDay(electionDate?: string | null): boolean {
  if (!electionDate) return false;
  const today = new Date().toISOString().split("T")[0];
  const d = new Date(electionDate).toISOString().split("T")[0];
  return today === d;
}

// Returns true if current time is before 4pm local time
function isBeforeEndOfDay(): boolean {
  return new Date().getHours() < 16;
}

function ElectionDayComponent() {
  const {
    selectedElectionGroup,
    selectedElection,
    selectedStateId,
    selectedDistrictId,
    selectedFederalConstituencyId,
    selectedStateConstituencyId,
    selectedLGAId,
    selectedWardId,
    party,
    electionCandidates,
    activeParties,
    isLive,
  } = useAppContext();

  const fetchPollingUnitUpdatesFn = useServerFn(getPollingUnitUpdates);
  const fetchElectionStatsFn = useServerFn(getElectionStats);
  const fetchScopedFinalResultFn = useServerFn(getElectionScopedFinalResult);

  const { data: electionStatsData, isLoading: isStatsLoading } = useQuery({
    queryKey: [
      "election-stats",
      selectedElectionGroup?.id,
      party?.id,
      selectedStateId,
      selectedDistrictId,
      selectedFederalConstituencyId,
      selectedStateConstituencyId,
      selectedLGAId,
      selectedWardId,
    ],
    queryFn: () =>
      fetchElectionStatsFn({
        data: {
          electionGroupId: selectedElectionGroup?.id as number,
          partyId: party?.id,
          stateId: selectedStateId,
          senatorialDistrictId: selectedDistrictId,
          federalConstituencyId: selectedFederalConstituencyId,
          stateAssemblyConstituencyId: selectedStateConstituencyId,
          lgaId: selectedLGAId,
          wardId: selectedWardId,
        },
      }),
    enabled: !!selectedElectionGroup?.id,
  });
  console.log("DATA", {
    party_id: party?.id,
    electionGroupId: selectedElectionGroup?.id as number,
    stateId: selectedStateId,
    senatorialDistrictId: selectedDistrictId,
    federalConstituencyId: selectedFederalConstituencyId,
    stateAssemblyConstituencyId: selectedStateConstituencyId,
    lgaId: selectedLGAId,
    wardId: selectedWardId,
  });
  console.log("ELECTION STATS", electionStatsData);

  // Fetch scoped election final result
  const { data: scopedResultData, isLoading: isResultLoading } = useQuery({
    queryKey: [
      "election-scoped-final-result",
      selectedElection?.id,
      selectedStateId,
      selectedDistrictId,
      selectedFederalConstituencyId,
      selectedStateConstituencyId,
      selectedLGAId,
      selectedWardId,
    ],
    queryFn: () =>
      fetchScopedFinalResultFn({
        data: {
          electionId: selectedElection?.id as number,
          wardId: selectedWardId,
          stateConstituencyId: selectedStateConstituencyId,
          lgaId: selectedLGAId,
          federalConstituencyId: selectedFederalConstituencyId,
          senatorialDistrictId: selectedDistrictId,
          stateId: selectedStateId,
        },
      }),
    enabled: !!selectedElection?.id,
  });

  const resolvedStats =
    electionStatsData?.data?.party_stats ||
    electionStatsData?.data?.stats ||
    {};
  const targets =
    electionStatsData?.data?.targets || electionStatsData?.data?.stats || {};

  const finalResultObj = scopedResultData?.data?.final_result || null;

  const sortedResults = mergeElectionResults({
    candidates: electionCandidates || [],
    electionFinalResults: finalResultObj,
    parties: activeParties.length > 0 ? activeParties : party ? [party] : [],
    isLive,
  });

  return (
    <DashboardLayout>
      <HomePageHeader activeTab="election-day" />

      {/* Filter and Switcher Row */}
      <ElectionScopeSelector />

      <ResultTypeCardInfo isLive={isLive} />

      {/* Grid Main Layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr] items-start">
        {/* Left Hand Column */}
        <div className="space-y-6">
          {/* Leaderboard Card – scoped election result */}
          <LeaderboardCardWrapper>
            {isResultLoading ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Loading results…
              </div>
            ) : sortedResults.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-medium">
                No result data available for this scope yet.
              </div>
            ) : (
              sortedResults.slice(0, 3).map((item: any, index: number) => {
                const partyShortName: string =
                  item.party_short_name || item.short_name || "";
                const candidateName: string | null =
                  item.name ||
                  item.candidate_name ||
                  (item.first_name
                    ? `${item.first_name} ${item.last_name || ""}`.trim()
                    : null);
                const candidateAvatar: string | undefined =
                  item.candidate_avatar || item.avatar;
                const partyLogo: string | undefined =
                  item.party_logo || item.logo;
                const votes: number = item.votes ?? item.vote_count ?? 0;

                return (
                  <LeaderboardCardRow
                    key={partyShortName || index}
                    rank={index + 1}
                    image={candidateAvatar || partyLogo}
                    // image2={candidateAvatar ? partyLogo : undefined}
                    image2={partyLogo}
                    name={
                      candidateName
                        ? `${candidateName} (${partyShortName})`
                        : partyShortName
                    }
                    regionsWinningCount={
                      selectedWardId
                        ? `${item.polling_units_winning_count || 0} PUs`
                        : selectedLGAId || selectedStateConstituencyId
                          ? `${item.wards_winning_count || 0} wards`
                          : selectedStateId ||
                              selectedDistrictId ||
                              selectedFederalConstituencyId
                            ? `${item.lgas_winning_count || 0} LGAs`
                            : `${item.states_winning_count || 0} states`
                    }
                    votesCount={`${votes.toLocaleString()} votes`}
                  />
                );
              })
            )}
            <div className="px-6 w-full my-2">
              <Button
                variant="black"
                size="2xl"
                className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
              >
                See all
              </Button>
            </div>
          </LeaderboardCardWrapper>

          {/* Activities Stream */}
          <ActivitiesCard
            electionGroupId={selectedElectionGroup?.id}
            stateId={selectedStateId}
            senatorialDistrictId={selectedDistrictId}
            federalConstituencyId={selectedFederalConstituencyId}
            stateAssemblyConstituencyId={selectedStateConstituencyId}
            lgaId={selectedLGAId}
            wardId={selectedWardId}
            fetchPollingUnitUpdates={fetchPollingUnitUpdatesFn}
          />
        </div>

        {/* Right Hand Column */}
        <ElectionStatsSidebar
          stats={resolvedStats}
          targets={targets}
          isLoading={isStatsLoading}
        />
      </div>

      {/* Stacked Bottom Sections */}
      <div className="space-y-10 pt-5 pb-24">
        <FinalResultsGallery activeParties={activeParties} />
        <AgentUpdatesGallery />
        <ReportsGallery />
      </div>
    </DashboardLayout>
  );
}

function ResultTypeCardInfo({ isLive }: { isLive: boolean }) {
  const LabelDetails = ({
    title,
    subtitle,
    className,
  }: {
    title: string;
    subtitle: string;
    className?: string;
  }) => (
    <div className={cn("text-[15px] space-y-2 text-primary", className)}>
      <p>
        <span className="font-bold">{isLive ? "Live" : "Final"} Results:</span>{" "}
        {title}
      </p>
      <p>
        <span className="font-bold">Note:</span> {subtitle}
      </p>
    </div>
  );

  if (!isLive) {
    return (
      <InfoCard
        icon={<AlertIcon className="size-6 text-c-80" />}
        variant="grey"
        label={
          <LabelDetails
            title={
              "These are final results extracted from uploaded EC8 forms submitted by either INEC, party unit polling agents or voters at their polling unit."
            }
            subtitle={"The results for this start coming in anything past 4PM."}
            className="text-c-80"
          />
        }
      />
    );
  }

  return (
    <InfoCard
      icon={<AlertIcon className="size-6 text-primary" />}
      variant="green"
      label={
        <LabelDetails
          title={
            "These are live voting results from users who have voted at their polling units and decided to indicate who they voted for on Free9ja."
          }
          subtitle={
            "They may not be fully accurate because not everyone reports their vote on Free9ja."
          }
        />
      }
    />
  );
}

export function GalleryItem({
  imageSrc,
  avatarSrc,
  title,
  subtitle,
  time,
  showReportIcon,
  onClick,
}: {
  imageSrc: string;
  avatarSrc?: string;
  title: string;
  subtitle: string;
  time: string;
  showReportIcon?: boolean;
  onClick?: () => void;
}) {
  let displayTime = time;
  if (time && time !== "5:43 PM") {
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      displayTime = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  const isVideo = imageSrc?.match(/\.(mp4|webm|ogg|mov)$/i);

  return (
    <div className="space-y-2.5 cursor-pointer group" onClick={onClick}>
      {/* Image container */}
      <div className="relative aspect-[2.1/3] w-full rounded-2xl overflow-hidden shadow-xs border border-c-10 bg-border">
        {isVideo ? (
          <video
            src={`${imageSrc}#t=0.1`}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            preload="metadata"
            muted
            playsInline
          />
        ) : (
          <img
            src={imageSrc}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <p className="absolute bottom-3 right-3 text-sm font-bold text-white [text-shadow:_0_0px_8px_rgb(0_0_0_/_0.9)]">
          {displayTime}
        </p>
      </div>

      {/* Details sub-row */}
      <div className="flex gap-2 items-start px-0.5">
        <div className="size-8 rounded-full overflow-hidden bg-neutral-200 shrink-0">
          {avatarSrc && (
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs text-c-90 truncate leading-tight">
            {title}
          </p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[11px] text-c-50 truncate leading-none">
              {subtitle}
            </span>
            {showReportIcon && (
              <ReportCubeIcon className="size-4 rounded-[2px] shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type UpdateItem = {
  polling_unit_name?: string;
  polling_unit_id?: number | string;
  lga_name?: string;
  state_name?: string;
  user_avatar?: string;
  media_urls?: string[];
  created_at?: string;
  candidate_results?: any;
  [key: string]: any;
};

function GalleryRow({
  title,
  count,
  imageSrc,
  showReportIcon,
  items,
  onItemClick,
  seeAllHref,
}: {
  title: string;
  count: string;
  imageSrc?: string;
  showReportIcon?: boolean;
  items?: UpdateItem[];
  onItemClick?: (item: UpdateItem) => void;
  seeAllHref?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-xl font-semibold text-c-90 flex items-center gap-1.5">
          {showReportIcon && <ReportCubeIcon className="size-7" />}
          {title} <span className="text-c-40 font-normal">({count})</span>
        </h2>
        {seeAllHref ? (
          <Link
            to={seeAllHref as any}
            className="text-c-60 hover:text-c-80 hover:underline transition duration-200 cursor-pointer"
          >
            See all
          </Link>
        ) : (
          <button className="text-c-60 hover:text-c-80 hover:underline transition duration-200 cursor-pointer">
            See all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {items?.map((item, index) => {
          const rawImage =
            item.media_urls ||
            [item.finalResult?.result_sheet_image_url].filter(Boolean);
          const resolvedImageSrc = Array.isArray(rawImage)
            ? rawImage[0]
            : rawImage;
          const resolvedTitle =
            item.polling_unit_name || `PU ${item.polling_unit_id || ""}`;
          const resolvedSubtitle = [item.lga_name, item.state_name]
            .filter(Boolean)
            .join(", ");

          return (
            <GalleryItem
              key={index}
              imageSrc={(resolvedImageSrc as string) || imageSrc || ""}
              avatarSrc={item.user_avatar || item.finalResult?.uploader_avatar}
              title={resolvedTitle}
              subtitle={resolvedSubtitle}
              time={item.created_at || "5:43 PM"}
              showReportIcon={showReportIcon}
              onClick={() => onItemClick?.(item)}
            />
          );
        })}
      </div>
    </div>
  );
}

function UpdatesGallery({ isReport }: { isReport: boolean }) {
  const { partyShortName } = useParams({ strict: false });
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const {
    selectedElectionGroup,
    selectedStateId,
    selectedDistrictId,
    selectedFederalConstituencyId,
    selectedStateConstituencyId,
    selectedLGAId,
    selectedWardId,
  } = useAppContext();
  const fetchPollingUnitUpdatesFn = useServerFn(getPollingUnitUpdates);

  const {
    data: updatesData,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "pollingUnitUpdates",
      selectedElectionGroup?.id,
      selectedStateId,
      selectedDistrictId,
      selectedFederalConstituencyId,
      selectedStateConstituencyId,
      selectedLGAId,
      selectedWardId,
      isReport,
      true, // has_media
    ],
    queryFn: ({ pageParam }) =>
      fetchPollingUnitUpdatesFn({
        data: {
          electionGroupId: selectedElectionGroup?.id,
          stateId: selectedStateId,
          senatorialDistrictId: selectedDistrictId,
          federalConstituencyId: selectedFederalConstituencyId,
          stateAssemblyConstituencyId: selectedStateConstituencyId,
          lgaId: selectedLGAId,
          wardId: selectedWardId,
          isReport,
          hasMedia: true,
          limit: 6,
          cursor: pageParam as string | undefined,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.next_cursor || undefined,
    enabled: !!selectedElectionGroup?.id,
  });

  const items =
    updatesData?.pages.flatMap((page: any) => page.data?.updates || []) || [];

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < items.length - 1) {
      const nextIndex = selectedIndex + 1;
      setSelectedIndex(nextIndex);
      if (nextIndex >= items.length - 2 && hasNextPage) fetchNextPage();
    } else if (selectedIndex !== null && hasNextPage) {
      fetchNextPage().then(() => setSelectedIndex(selectedIndex + 1));
    }
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0)
      setSelectedIndex(selectedIndex - 1);
  };

  return (
    <>
      <GalleryRow
        title={isReport ? "Reports" : "Agent Updates"}
        count={items.length.toString()}
        items={items}
        showReportIcon={isReport}
        seeAllHref={`/${partyShortName}/home/updates${isReport ? "?is_report=true" : ""}`}
        onItemClick={(item) => {
          const index = items.findIndex((i: any) => i.id === item.id);
          if (index !== -1) setSelectedIndex(index);
        }}
      />
      {selectedItem && (
        <UpdateReel
          result={selectedItem}
          onClose={() => setSelectedIndex(null)}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={
            selectedIndex !== null &&
            (selectedIndex < items.length - 1 || hasNextPage)
          }
          hasPrev={selectedIndex !== null && selectedIndex > 0}
        />
      )}
    </>
  );
}

function AgentUpdatesGallery() {
  return <UpdatesGallery isReport={false} />;
}

function ReportsGallery() {
  return <UpdatesGallery isReport={true} />;
}

function FinalResultsGallery({ activeParties }: { activeParties?: any[] }) {
  const { partyShortName } = useParams({ strict: false });
  const [selectedResultIndex, setSelectedResultIndex] = React.useState<
    number | null
  >(null);

  const {
    selectedElectionGroup,
    selectedElection,
    selectedStateId,
    selectedDistrictId,
    selectedFederalConstituencyId,
    selectedStateConstituencyId,
    selectedLGAId,
    selectedWardId,
    electionCandidates,
  } = useAppContext();
  const fetchPollingUnitFinalResultsFn = useServerFn(
    getPollingUnitFinalResults,
  );

  const {
    data: finalResultsData,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "pollingUnitFinalResults",
      selectedElectionGroup?.id,
      selectedStateId,
      selectedDistrictId,
      selectedFederalConstituencyId,
      selectedStateConstituencyId,
      selectedLGAId,
      selectedWardId,
      true, // has_media
    ],
    queryFn: ({ pageParam }) =>
      fetchPollingUnitFinalResultsFn({
        data: {
          electionGroupId: selectedElectionGroup?.id,
          stateId: selectedStateId || undefined,
          senatorialDistrictId: selectedDistrictId || undefined,
          federalConstituencyId: selectedFederalConstituencyId || undefined,
          stateAssemblyConstituencyId: selectedStateConstituencyId || undefined,
          lgaId: selectedLGAId || undefined,
          wardId: selectedWardId || undefined,
          hasMedia: true,
          limit: 6,
          cursor: pageParam as string | undefined,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.next_cursor || undefined,
    enabled: !!selectedElectionGroup?.id,
  });

  const results =
    finalResultsData?.pages.flatMap((page: any) => page.data?.results || []) ||
    [];
  const items = results;

  const selectedResult =
    selectedResultIndex !== null ? items[selectedResultIndex] : null;

  const handleNext = () => {
    if (
      selectedResultIndex !== null &&
      selectedResultIndex < items.length - 1
    ) {
      const nextIndex = selectedResultIndex + 1;
      setSelectedResultIndex(nextIndex);
      if (nextIndex >= items.length - 2 && hasNextPage) {
        fetchNextPage();
      }
    } else if (selectedResultIndex !== null && hasNextPage) {
      fetchNextPage().then(() => {
        setSelectedResultIndex(selectedResultIndex + 1);
      });
    }
  };

  const handlePrev = () => {
    if (selectedResultIndex !== null && selectedResultIndex > 0) {
      setSelectedResultIndex(selectedResultIndex - 1);
    }
  };

  return (
    <>
      <GalleryRow
        title="Final Results"
        count={items.length.toString()}
        imageSrc="/nigerian_result_sheet_mockup.png"
        items={items}
        onItemClick={(item) => {
          const index = items.findIndex((i: any) => i.id === item.id);
          if (index !== -1) setSelectedResultIndex(index);
        }}
        seeAllHref={`/${partyShortName}/home/results`}
      />
      {selectedResult && (
        <FinalResultReel
          result={selectedResult}
          candidatesList={electionCandidates}
          activeParties={activeParties}
          onClose={() => setSelectedResultIndex(null)}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={
            selectedResultIndex !== null &&
            (selectedResultIndex < items.length - 1 || hasNextPage)
          }
          hasPrev={selectedResultIndex !== null && selectedResultIndex > 0}
        />
      )}
    </>
  );
}
