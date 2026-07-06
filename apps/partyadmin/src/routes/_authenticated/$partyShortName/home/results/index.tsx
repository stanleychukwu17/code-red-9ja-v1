import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useAppContext } from "#/providers/providers";
import {
  getStateFinalResults,
  getSenatorialDistrictFinalResults,
  getFederalConstituencyFinalResults,
  getLGAFinalResults,
  getWardFinalResults,
} from "#/lib/server/final-results";
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

/** Derive the winning party short name from a candidate_results array or a
 *  top-level `winning_party_short_name` field, depending on what the backend
 *  returns for each final-result type. */
function getWinningPartyShortName(result: any): string | undefined {
  // Prefer an explicit field if the backend adds one
  if (result?.winning_party_short_name)
    return getPgString(result.winning_party_short_name);
  // Otherwise derive it by finding the candidate_results entry with the highest vote_count
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

// ── Scope detection ───────────────────────────────────────────────────────────

type Scope =
  | "nationwide"
  | "state"
  | "senatorial_district"
  | "federal_constituency"
  | "state_constituency"
  | "lga"
  | "ward";

function detectScope(ctx: {
  selectedStateId?: number;
  selectedDistrictId?: number;
  selectedFederalConstituencyId?: number;
  selectedStateConstituencyId?: number;
  selectedLGAId?: number;
  selectedWardId?: number;
}): Scope {
  if (ctx.selectedWardId) return "ward";
  if (ctx.selectedLGAId) return "lga";
  if (ctx.selectedStateConstituencyId) return "state_constituency";
  if (ctx.selectedFederalConstituencyId) return "federal_constituency";
  if (ctx.selectedDistrictId) return "senatorial_district";
  if (ctx.selectedStateId) return "state";
  return "nationwide";
}

// ── Column header labels per scope ────────────────────────────────────────────

const SCOPE_LABEL: Record<Scope, string> = {
  nationwide: "State",
  state: "Senatorial District",
  senatorial_district: "Federal Constituency",
  federal_constituency: "LGA",
  state_constituency: "Ward",
  lga: "Ward",
  ward: "Polling Unit",
};

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

  const scope = detectScope({
    selectedStateId,
    selectedDistrictId,
    selectedFederalConstituencyId,
    selectedStateConstituencyId,
    selectedLGAId,
    selectedWardId,
  });

  const fetchStateFinalResults = useServerFn(getStateFinalResults);
  const fetchSenatorialFinalResults = useServerFn(
    getSenatorialDistrictFinalResults,
  );
  const fetchFederalConstituencyFinalResults = useServerFn(
    getFederalConstituencyFinalResults,
  );
  const fetchLGAFinalResults = useServerFn(getLGAFinalResults);
  const fetchWardFinalResults = useServerFn(getWardFinalResults);

  const electionGroupId = selectedElectionGroup?.id;
  const electionId = selectedElection?.id;
  const enabled = !!electionGroupId;

  const stateQuery = useQuery({
    queryKey: ["state-final-results", electionGroupId, electionId],
    queryFn: () =>
      fetchStateFinalResults({
        data: { electionGroupId, electionId, limit: 50 },
      }),
    enabled: enabled && scope === "nationwide",
  });

  const senatorialQuery = useQuery({
    queryKey: [
      "senatorial-final-results",
      electionGroupId,
      electionId,
      selectedStateId,
    ],
    queryFn: () =>
      fetchSenatorialFinalResults({
        data: {
          electionGroupId,
          electionId,
          stateId: selectedStateId,
          limit: 50,
        },
      }),
    enabled: enabled && scope === "state",
  });

  const federalConstQuery = useQuery({
    queryKey: [
      "federal-const-final-results",
      electionGroupId,
      electionId,
      selectedDistrictId,
    ],
    queryFn: () =>
      fetchFederalConstituencyFinalResults({
        data: {
          electionGroupId,
          electionId,
          senatorialDistrictId: selectedDistrictId,
          limit: 50,
        },
      }),
    enabled: enabled && scope === "senatorial_district",
  });

  const lgaQuery = useQuery({
    queryKey: [
      "lga-final-results",
      electionGroupId,
      electionId,
      selectedFederalConstituencyId,
    ],
    queryFn: () =>
      fetchLGAFinalResults({
        data: {
          electionGroupId,
          electionId,
          federalConstituencyId: selectedFederalConstituencyId,
          limit: 100,
        },
      }),
    enabled: enabled && scope === "federal_constituency",
  });

  const wardByLgaQuery = useQuery({
    queryKey: [
      "ward-final-results-by-lga",
      electionGroupId,
      electionId,
      selectedLGAId,
    ],
    queryFn: () =>
      fetchWardFinalResults({
        data: {
          electionGroupId,
          electionId,
          lgaId: selectedLGAId,
          limit: 200,
        },
      }),
    enabled: enabled && scope === "lga",
  });

  const wardByStateConstQuery = useQuery({
    queryKey: [
      "ward-final-results-by-state-const",
      electionGroupId,
      electionId,
      selectedStateConstituencyId,
    ],
    queryFn: () =>
      fetchWardFinalResults({
        data: {
          electionGroupId,
          electionId,
          stateConstituencyId: selectedStateConstituencyId,
          limit: 200,
        },
      }),
    enabled: enabled && scope === "state_constituency",
  });

  const wardByWardQuery = useQuery({
    queryKey: [
      "ward-final-results-by-ward",
      electionGroupId,
      electionId,
      selectedWardId,
    ],
    queryFn: () =>
      fetchWardFinalResults({
        data: {
          electionGroupId,
          electionId,
          lgaId: selectedWardId, // treat ward as lga filter when in ward scope
          limit: 200,
        },
      }),
    enabled: enabled && scope === "ward",
  });

  // Map scope → active query
  const activeQuery = {
    nationwide: stateQuery,
    state: senatorialQuery,
    senatorial_district: federalConstQuery,
    federal_constituency: lgaQuery,
    state_constituency: wardByStateConstQuery,
    lga: wardByLgaQuery,
    ward: wardByWardQuery,
  }[scope];

  const isLoading = activeQuery.isLoading;
  const rawItems: any[] =
    activeQuery.data?.data?.results ||
    activeQuery.data?.data?.items ||
    activeQuery.data?.results ||
    activeQuery.data?.items ||
    [];

  /** Convert a raw API item to the tile shape. The API returns rows where each
   *  item has a geography record merged with its final_result (if any). */
  function toTileRow(item: any): ElectionResultType {
    const result = item.final_result || item;
    const winningPartyShortName = getWinningPartyShortName(result);

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

    const totalVotes = getTotalVotes(result);

    // Calculate lead
    let leadingByVotes: number | undefined;
    let leadingByPercentage: number | undefined;
    if (Array.isArray(result?.candidate_results) && totalVotes) {
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

    // Determine the geography label based on scope
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
  const locationLabel = SCOPE_LABEL[scope];

  if (!electionGroupId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-c-50 text-lg">
          Please select an election group to view results.
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
    </div>
  );
}
