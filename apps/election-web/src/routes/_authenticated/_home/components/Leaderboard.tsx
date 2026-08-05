import { Button } from "@repo/ui/components/button";
import {
  LeaderboardCardRow,
  LeaderboardCardWrapper,
} from "@repo/ui/components/cards/leaderboard-card";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "#/hooks/useAuth";
import { mergeElectionResults } from "@repo/ui/lib/merge-election-results";
import { Loader2 } from "lucide-react";

export function CandidatesLeaderboard() {
  const navigate = useNavigate();
  const {
    selectedElection,
    activeParties,
    electionCandidates,
    finalResultObj,
    isLive,
    isResultLoading,
    party,
    selectedSupervisorAssignment,
    isLock,
  } = useAuth();

  const sortedResults = mergeElectionResults({
    candidates: electionCandidates || [],
    electionFinalResults: finalResultObj,
    parties:
      activeParties.length > 0
        ? activeParties
        : party?.shortName
          ? [{ short_name: party.shortName, ...party }]
          : [],
    isLive,
  });

  return (
    <LeaderboardCardWrapper className="mx-2.5">
      {isResultLoading ? (
        <div className="flex items-center justify-center h-full flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedElection?.id ? (
        <div className="flex items-center justify-center h-full flex-1 text-neutral-500 text-sm">
          Select an election to see candidates
        </div>
      ) : sortedResults.length === 0 ? (
        <div className="flex items-center justify-center h-full flex-1 text-neutral-500 text-sm">
          No candidates found
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
          const partyLogo: string | undefined = item.party_logo || item.logo;
          const votes: number = item.votes ?? item.vote_count ?? 0;

          let regionsWinningCountStr = `${item.states_winning_count || 0} states`;
          if (isLock) {
            if (selectedSupervisorAssignment?.type === "state") {
              regionsWinningCountStr = `${item.lgas_winning_count || 0} LGAs`;
            } else if (selectedSupervisorAssignment?.type === "lga") {
              regionsWinningCountStr = `${item.wards_winning_count || 0} wards`;
            } else if (
              selectedSupervisorAssignment?.type === "ward" ||
              !selectedSupervisorAssignment
            ) {
              regionsWinningCountStr = `${item.polling_units_winning_count || 0} PUs`;
            }
          }

          return (
            <LeaderboardCardRow
              key={partyShortName || index}
              rank={index + 1}
              image={candidateAvatar || partyLogo}
              image2={partyLogo}
              name={
                candidateName
                  ? `${candidateName} (${partyShortName})`
                  : // `${candidateName}`
                    partyShortName
              }
              regionsWinningCount={regionsWinningCountStr}
              votesCount={`${votes.toLocaleString()} votes`}
            />
          );
        })
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-2 mt-2 px-4">
        <Button
          type="button"
          size="extra-large"
          className="bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
        >
          Show all
        </Button>
        <Button
          type="button"
          size="extra-large"
          onClick={() => navigate({ to: "/report" })}
          className="bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-[12px]"
        >
          <ReportIcon className="w-5 h-5 shrink-0" />
          Report
        </Button>
      </div>
    </LeaderboardCardWrapper>
  );
}
