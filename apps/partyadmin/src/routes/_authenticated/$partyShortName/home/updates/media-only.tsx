import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useIntersectionObserver } from "usehooks-ts";
import { useAppContext } from "#/providers/providers";
import { getPollingUnitUpdates } from "#/lib/server/polling-unit-updates";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/updates/media-only",
)({
  component: UpdatesMediaOnlyComponent,
});

function UpdatesMediaOnlyComponent() {
  const { is_report } = Route.useSearch() as any; // Using type assertion as search is validated at the layout
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
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [
      "pollingUnitUpdatesMedia",
      selectedElectionGroup?.id,
      selectedStateId,
      selectedDistrictId,
      selectedFederalConstituencyId,
      selectedStateConstituencyId,
      selectedLGAId,
      selectedWardId,
      is_report,
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
          isReport: is_report,
          hasMedia: true,
          limit: 30,
          cursor: pageParam as string | undefined,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.data?.next_cursor || undefined,
    enabled: !!selectedElectionGroup?.id,
  });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Extract all media items from the paginated data
  const mediaItems = React.useMemo(() => {
    const allUpdates =
      updatesData?.pages.flatMap((page: any) => page.data?.updates || []) || [];
    
    // Some updates might have multiple media URLs, we can flatten them or just pick the first.
    // The screenshot implies a 1:1 mapping of grid cards to updates, so we'll just pick the first image,
    // or flatten if needed. We'll flatten them so every image gets its own card.
    return allUpdates.flatMap((item: any) => {
      const urls = item.media_urls || [];
      return urls.map((url: string) => ({
        ...item,
        mediaUrl: url,
      }));
    });
  }, [updatesData]);

  if (!selectedElectionGroup?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-c-50 text-lg">
          Please select an election to view media.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin size-8 text-c-50" />
      </div>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-c-10 size-16 rounded-full flex items-center justify-center mb-4">
          <svg
            className="size-8 text-c-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-c-80">No media found</h3>
        <p className="text-c-50 mt-1">
          There are no media attachments for this location.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full pt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {mediaItems.map((item: any, idx: number) => {
          const timeString = item.created_at
            ? new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : "";
          const locationParts = [item.lga_name, item.state_name].filter(Boolean);
          const locationStr = item.polling_unit_name || locationParts.join(" / ") || `PU ${item.polling_unit_id}`;

          return (
            <div key={`${item.id}-${idx}`} className="flex flex-col gap-2">
              <div className="relative aspect-[3/4] bg-[#e9e9e9] rounded-[16px] overflow-hidden group cursor-pointer">
                <img
                  src={item.mediaUrl}
                  alt="Update media"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {timeString && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-white text-[11px] font-medium tracking-wide">
                    {timeString}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-1">
                {item.user_avatar ? (
                  <img
                    src={item.user_avatar}
                    alt="user"
                    className="size-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="size-6 rounded-full bg-c-20 flex items-center justify-center text-[10px] text-c-60 font-medium shrink-0">
                    {item.user_name?.[0] || "U"}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-medium text-c-90 truncate leading-tight">
                    {item.user_name || "Unknown"}
                  </span>
                  <span className="text-[10px] text-c-50 truncate leading-tight">
                    {locationStr}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-10 flex justify-center text-c-50 text-sm"
        >
          {isFetchingNextPage ? "Loading more..." : "Scroll to load more"}
        </div>
      )}
    </div>
  );
}
