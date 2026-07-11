import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { useIntersectionObserver } from "usehooks-ts";
import { useAppContext } from "#/hooks/useAppContext";
import { getPollingUnitUpdates } from "#/lib/server/polling-unit-updates";
import { AppAvatar, Avatar, AvatarImage } from "@repo/ui/components/avatar";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/updates/",
)({
  component: UpdatesFeedComponent,
});

function UpdatesFeedComponent() {
  const { is_report } = Route.useSearch();
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
      "pollingUnitUpdatesFeed",
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
          limit: 20,
          cursor: pageParam as string | undefined,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.data?.next_cursor || undefined,
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

  const items =
    updatesData?.pages.flatMap((page: any) => page.data?.updates || []) || [];

  if (!selectedElectionGroup?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-c-50 text-lg">
          Please select an election to view updates.
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

  if (items.length === 0) {
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-c-80">No updates found</h3>
        <p className="text-c-50 mt-1">
          There are no updates or reports for this location yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[800px] mx-auto py-6 space-y-8">
      {items.map((item: any) => (
        <UpdateFeedItem key={item.id} item={item} />
      ))}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex justify-center text-c-50 text-sm"
        >
          {isFetchingNextPage ? "Loading more..." : "Scroll to load more"}
        </div>
      )}
    </div>
  );
}

function UpdateFeedItem({ item }: { item: any }) {
  const timeString = item.created_at
    ? new Date(item.created_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const locationParts = [item.lga_name, item.state_name].filter(Boolean);
  const locationStr =
    item.polling_unit_name ||
    locationParts.join(" / ") ||
    `PU ${item.polling_unit_id}`;

  const tags = item.report_types || [];
  const mediaUrls = item.media_urls || [];
  const upvotes = item.upvote_count || 0; // if available, or just hardcode a placeholder if not in schema

  return (
    <div className="flex gap-4">
      <AppAvatar src={item.user_avatar} alt="profile image" />

      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="text-sm">
            <span className="font-semibold text-c-90">
              {item.user_name || "Unknown User"}
            </span>
            <span className="text-c-50 ml-1">• {timeString}</span>
          </div>
          <div className="text-xs text-c-50 text-right uppercase tracking-wider font-medium max-w-[200px] truncate">
            {locationStr}
          </div>
        </div>

        {/* Message */}
        <p className="text-c-80 text-[15px] leading-relaxed">{item.message}</p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="px-2.5 py-1 text-xs font-medium bg-[#fcf2ed] text-[#d67b5a] rounded-md whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer info (Upvotes, Status, Media) */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            {/* Upvote icon placeholder */}
            <div className="flex items-center gap-1.5 text-c-60 font-medium text-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20V10M18 20V4M6 20v-4" />
              </svg>
              <span>{upvotes}</span>
            </div>

            {/* Unresolved Report Badge */}
            {item.is_report && (
              <div className="flex items-center gap-1 text-[#e11d48] text-xs font-bold">
                <AlertCircle className="size-4" />
                <span>New Report: Unresolved</span>
              </div>
            )}
          </div>

          {/* Media Thumbnails */}
          {mediaUrls.length > 0 && (
            <div className="flex -space-x-2">
              {mediaUrls.slice(0, 4).map((url: string, idx: number) => (
                <div
                  key={idx}
                  className="size-8 rounded-md overflow-hidden border-2 border-white shadow-sm"
                >
                  <img
                    src={url}
                    alt="media"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
