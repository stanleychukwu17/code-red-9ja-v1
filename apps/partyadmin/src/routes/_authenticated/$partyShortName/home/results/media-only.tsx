import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAppContext } from "#/hooks/useAppContext";
import { getPollingUnitFinalResults } from "#/lib/server/elections";
import {
  GalleryItem,
  type UpdateItem,
} from "../election-day";
import {
  FinalResultReel,
} from "../components/-final-result-reel";
import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/results/media-only",
)({
  component: ResultsMediaOnlyComponent,
});

function ResultsMediaOnlyComponent() {
  const {
    selectedElectionGroup,
    selectedStateId,
    selectedDistrictId,
    selectedFederalConstituencyId,
    selectedStateConstituencyId,
    selectedLGAId,
    selectedWardId,
    electionCandidates,
  } = useAppContext();

  const [selectedResultIndex, setSelectedResultIndex] = React.useState<
    number | null
  >(null);

  const fetchPollingUnitFinalResultsFn = useServerFn(
    getPollingUnitFinalResults,
  );

  const {
    data: finalResultsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
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
          limit: 20,
          cursor: pageParam as string | undefined,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.next_cursor || undefined,
    enabled: !!selectedElectionGroup?.id,
  });

  const items =
    finalResultsData?.pages.flatMap((page: any) => page.data?.results || []) ||
    [];

  const selectedItem = selectedResultIndex !== null ? items[selectedResultIndex] : null;

  const handleNext = () => {
    if (selectedResultIndex !== null && selectedResultIndex < items.length - 1) {
      const nextIndex = selectedResultIndex + 1;
      setSelectedResultIndex(nextIndex);
      if (nextIndex >= items.length - 2 && hasNextPage) fetchNextPage();
    } else if (selectedResultIndex !== null && hasNextPage) {
      fetchNextPage().then(() => setSelectedResultIndex(selectedResultIndex + 1));
    }
  };

  const handlePrev = () => {
    if (selectedResultIndex !== null && selectedResultIndex > 0)
      setSelectedResultIndex(selectedResultIndex - 1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 w-full text-c-50">
        <Loader2 className="animate-spin size-8" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-c-10 size-16 rounded-full flex items-center justify-center mb-4">
          <svg className="size-8 text-c-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-c-80">No results media found</h3>
        <p className="text-c-50 mt-1">Try adjusting your filters or selecting a different election group.</p>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item: UpdateItem, index: number) => {
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
              imageSrc={(resolvedImageSrc as string) || "/nigerian_result_sheet_mockup.png"}
              avatarSrc={item.user_avatar || item.finalResult?.uploader_avatar}
              title={resolvedTitle}
              subtitle={resolvedSubtitle}
              time={item.created_at || "5:43 PM"}
              showReportIcon={false}
              onClick={() => setSelectedResultIndex(index)}
            />
          );
        })}
      </div>

      {hasNextPage && (
        <div className="flex justify-center mt-10">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full max-w-[300px]"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin size-4" /> Loading...
              </span>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      {selectedItem && (
        <FinalResultReel
          result={selectedItem}
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
    </div>
  );
}
