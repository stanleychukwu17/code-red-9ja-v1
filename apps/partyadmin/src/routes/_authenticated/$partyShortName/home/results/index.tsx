import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useIntersectionObserver } from "usehooks-ts";
import { useAppContext } from "#/hooks/useAppContext";
import {
  getStatesWithResults,
  getSenatorialDistrictsWithResults,
  getFederalConstituenciesWithResults,
  getLGAsWithResults,
  getWardsWithResults,
  getPollingUnitsWithResults,
} from "#/lib/server/election-results";
import {
  ElectionResultTableHeader,
  ElectionResultTableTile,
  ElectionResultType,
} from "#/components/tiles/election-result-tile";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/results/",
)({
  component: ResultsIndexComponent,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPgString(val: any): string {
  if (val && typeof val === "object" && "String" in val)
    return val.String || "";
  return val || "";
}

function getWinningPartyShortName(result: any): string | undefined {
  if (result?.winning_party_short_name)
    return getPgString(result.winning_party_short_name);
  if (Array.isArray(result?.candidate_results)) {
    const best = [...result.candidate_results].sort(
      (a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0),
    )[0];
    if (best?.vote_count > 0) return getPgString(best.party_short_name);
  }
  return undefined;
}

function getTotalVotes(result: any): number | undefined {
  if (result?.valid_votes !== undefined) return result.valid_votes;
  if (result?.votes_cast !== undefined) return result.votes_cast;
  return undefined;
}

// ── Main component ────────────────────────────────────────────────────────────

function ResultsIndexComponent() {
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

  // Server functions — new combined geo+result endpoints
  const fetchStatesWithResults = useServerFn(getStatesWithResults);
  const fetchSenatorialDistrictsWithResults = useServerFn(
    getSenatorialDistrictsWithResults,
  );
  const fetchFederalConstituenciesWithResults = useServerFn(
    getFederalConstituenciesWithResults,
  );
  const fetchLGAsWithResults = useServerFn(getLGAsWithResults);
  const fetchWardsWithResults = useServerFn(getWardsWithResults);
  const fetchPollingUnitsWithResults = useServerFn(getPollingUnitsWithResults);

  const electionId = selectedElection?.id;
  const enabled = !!electionId;

  // -- Determine which level we are currently viewing --
  const isWardSelected = !!selectedWardId;
  const isLgaSelected = !!selectedLGAId;
  const isStateConstSelected = !!selectedStateConstituencyId;
  const isFedConstSelected = !!selectedFederalConstituencyId;
  const isDistrictSelected = !!selectedDistrictId;
  const isStateSelected = !!selectedStateId;

  const shouldFetchWardsByLga = isLgaSelected && !isWardSelected;
  const shouldFetchWardsByStateConst =
    isStateConstSelected && !isWardSelected && !isLgaSelected;

  const getNextPageParam = (lastPage: any) => {
    if (lastPage?.meta?.has_more) {
      return lastPage.meta.next_cursor || "";
    }
    return undefined;
  };

  // One single infinite query that fetches geography + its final result in one shot
  const query = useInfiniteQuery({
    queryKey: [
      "election-geo-results",
      electionId,
      selectedWardId,
      selectedLGAId,
      selectedStateConstituencyId,
      selectedFederalConstituencyId,
      selectedDistrictId,
      selectedStateId,
    ],
    queryFn: async ({ pageParam }) => {
      const cursor = (pageParam as string) || undefined;
      const limit = 50;

      if (isWardSelected) {
        return fetchPollingUnitsWithResults({
          data: {
            electionId: electionId!,
            wardId: selectedWardId!,
            limit,
            cursor,
          },
        });
      } else if (shouldFetchWardsByStateConst) {
        return fetchWardsWithResults({
          data: {
            electionId: electionId!,
            stateAssemblyConstituencyId: selectedStateConstituencyId!,
            limit,
            cursor,
          },
        });
      } else if (shouldFetchWardsByLga) {
        return fetchWardsWithResults({
          data: {
            electionId: electionId!,
            lgaId: selectedLGAId!,
            limit,
            cursor,
          },
        });
      } else if (isFedConstSelected) {
        return fetchLGAsWithResults({
          data: {
            electionId: electionId!,
            federalConstituencyId: selectedFederalConstituencyId!,
            limit,
            cursor,
          },
        });
      } else if (isDistrictSelected) {
        return fetchFederalConstituenciesWithResults({
          data: {
            electionId: electionId!,
            senatorialDistrictId: selectedDistrictId!,
            limit,
            cursor,
          },
        });
      } else if (isStateSelected) {
        return fetchSenatorialDistrictsWithResults({
          data: {
            electionId: electionId!,
            stateId: selectedStateId!,
            limit,
            cursor,
          },
        });
      } else {
        return fetchStatesWithResults({
          data: { electionId: electionId!, limit, cursor },
        });
      }
    },
    initialPageParam: "",
    getNextPageParam,
    enabled,
  });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  React.useEffect(() => {
    if (isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [
    isIntersecting,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.fetchNextPage,
  ]);

  // -- Determine the label for the current level --
  let locationLabel = "State";
  if (isWardSelected) locationLabel = "Polling Unit";
  else if (shouldFetchWardsByStateConst || shouldFetchWardsByLga)
    locationLabel = "Ward";
  else if (isFedConstSelected) locationLabel = "LGA";
  else if (isDistrictSelected) locationLabel = "Federal Constituency";
  else if (isStateSelected) locationLabel = "Senatorial District";

  // -- Extract the result key from the nested object --
  const getFinalResult = (item: any): any => {
    return (
      item.state_final_result ??
      item.senatorial_district_final_result ??
      item.federal_constituency_final_result ??
      item.lga_final_result ??
      item.ward_final_result ??
      item.polling_unit_final_result ??
      null
    );
  };

  // -- Extract rows from all pages --
  const extractArray = (page: any): any[] => {
    if (!page) return [];
    const d = page.data ?? page;
    if (Array.isArray(d)) return d;
    if (typeof d === "object") {
      for (const key of Object.keys(d)) {
        if (Array.isArray(d[key])) return d[key];
      }
    }
    return [];
  };

  const rawItems: any[] = query.data?.pages.flatMap(extractArray) ?? [];

  /** Convert a raw API item to the tile shape */
  function toTileRow(item: any): ElectionResultType {
    const result = getFinalResult(item);
    const winningPartyShortName = result
      ? getWinningPartyShortName(result)
      : undefined;

    let candidate: any;
    if (winningPartyShortName) {
      candidate = (electionCandidates || []).find((c: any) => {
        const ps =
          typeof c.party_short_name === "object"
            ? c.party_short_name?.String
            : c.party_short_name;
        return ps?.toLowerCase() === winningPartyShortName.toLowerCase();
      });
    }

    const totalVotes = result ? getTotalVotes(result) : undefined;

    let leadingByVotes: number | undefined;
    let leadingByPercentage: number | undefined;
    if (result && Array.isArray(result?.candidate_results) && totalVotes) {
      const sorted = [...result.candidate_results].sort(
        (a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0),
      );
      if (sorted.length >= 2) {
        leadingByVotes =
          (sorted[0]?.vote_count ?? 0) - (sorted[1]?.vote_count ?? 0);
        leadingByPercentage =
          totalVotes > 0
            ? ((sorted[0]?.vote_count ?? 0) / totalVotes) * 100
            : undefined;
      } else if (sorted.length === 1) {
        leadingByVotes = sorted[0]?.vote_count ?? 0;
        leadingByPercentage =
          totalVotes > 0
            ? ((sorted[0]?.vote_count ?? 0) / totalVotes) * 100
            : undefined;
      }
    }

    const label =
      getPgString(item.name) ||
      getPgString(item.state_name) ||
      getPgString(item.district_name) ||
      getPgString(item.constituency_name) ||
      getPgString(item.lga_name) ||
      getPgString(item.ward_name) ||
      getPgString(item.polling_unit_name) ||
      `ID ${item.id ?? ""}`;

    return {
      label,
      candidateName: candidate
        ? `${getPgString(candidate.first_name)} ${getPgString(candidate.last_name)}`.trim()
        : winningPartyShortName
          ? `(${winningPartyShortName})`
          : undefined,
      partyShortName: winningPartyShortName,
      candidateAvatar: candidate ? getPgString(candidate.avatar) : undefined,
      leadingByVotes,
      leadingByPercentage,
      totalVotes,
    };
  }

  const rows: ElectionResultType[] = rawItems.map(toTileRow);

  if (!electionId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-c-50 text-lg">
          Please select an election to view results.
        </p>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin size-8 text-c-50" />
      </div>
    );
  }

  if (rows.length === 0) {
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-c-80">No results found</h3>
        <p className="text-c-50 mt-1">
          Results for this scope haven't been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full pt-4">
      <ElectionResultTableHeader locationLabel={locationLabel} />
      <div className="flex flex-col">
        {rows.map((row, idx) => (
          <ElectionResultTableTile key={idx} data={row} />
        ))}
      </div>
      {query.hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex justify-center text-c-50 text-sm"
        >
          {query.isFetchingNextPage ? "Loading more..." : "Scroll to load more"}
        </div>
      )}
    </div>
  );
}
