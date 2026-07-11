import {
  getElectionCandidates,
  getPollingUnitFinalResults,
  getPollingUnitUpdates,
} from "#/lib/server/elections";
import {
  FinalResultReel,
  ResultOverlayItem,
} from "./components/-final-result-reel";
import { UpdateReel } from "./components/-update-reel";
import { getPageHeader } from "#/lib/shared/meta";
import { useAppContext } from "#/hooks/useAppContext";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { ActivitiesCard } from "@repo/ui/components/cards/activities-card";
import { ElectionStatsSidebar } from "@repo/ui/components/cards/election-stats-sidebar";
import {
  LeaderboardCardRow,
  LeaderboardCardWrapper,
} from "@repo/ui/components/cards/leaderboard-card";
import { DashboardLayout } from "@repo/ui/components/custom/AdminLayouts";
import ReportCubeIcon from "@repo/ui/icons/report-cube-icon";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { ElectionScopeSelector } from "./components/-election-scope-selector";
import { HomePageHeader } from "./-header";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/election-day",
)({
  head: () => getPageHeader({ title: "Election Day Dashboard" }),
  component: ElectionDayComponent,
});

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
    electionCandidates: candidatesList = [],
  } = useAppContext();
  const fetchPollingUnitUpdatesFn = useServerFn(getPollingUnitUpdates);

  return (
    <DashboardLayout>
      <HomePageHeader activeTab="election-day" />

      {/* Filter and Switcher Row */}
      <ElectionScopeSelector />

      {/* Grid Main Layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr] items-start">
        {/* Left Hand Column */}
        <div className="space-y-6">
          {/* Leaderboard Card */}
          <LeaderboardCardWrapper>
            {candidatesList.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-medium">
                There are no candidates for this election was found.
              </div>
            ) : (
              candidatesList.map((candidate: any, index: number) => (
                <LeaderboardCardRow
                  key={candidate.id || index}
                  rank={index + 1}
                  avatarUrl={
                    candidate.avatar ||
                    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop"
                  }
                  name={
                    `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() ||
                    "Unknown Candidate"
                  }
                  partyShortName={candidate.party_short_name || "-"}
                  regionsWinningCount={"-"}
                  votesCount={`${candidate.vote_count || 0} votes`}
                />
              ))
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
        <ElectionStatsSidebar />
      </div>

      {/* Stacked Bottom Sections */}
      <div className="space-y-10 pt-5 pb-24">
        <FinalResultsGallery />
        <AgentUpdatesGallery />
        <ReportsGallery />
      </div>
    </DashboardLayout>
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

  return (
    <div className="space-y-2.5 cursor-pointer group" onClick={onClick}>
      {/* Image container */}
      <div className="relative aspect-[2.1/3] w-full rounded-2xl overflow-hidden shadow-xs border border-c-10 bg-border">
        <img
          src={imageSrc}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-xs">
          {time}
        </div> */}
        <p className="absolute bottom-3 right-3 text-sm font-bold text-white [text-shadow:_0_0px_8px_rgb(0_0_0_/_0.9)]">
          {displayTime}
        </p>
      </div>

      {/* Details sub-row */}
      <div className="flex gap-2 items-start px-0.5">
        <AppAvatar src={avatarSrc} alt="Avatar" className="size-8" />
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
  console.log("Gallery Row: ", { items });
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
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(
    null,
  );

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
    getNextPageParam: (lastPage) =>
      lastPage?.data?.next_cursor || undefined,
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

function FinalResultsGallery() {
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
