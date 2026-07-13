import { Button } from "@repo/ui/components/button";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getElectionCandidates } from "#/lib/server/elections";
import {
  LeaderboardCardRow,
  LeaderboardCardWrapper,
} from "@repo/ui/components/cards/leaderboard-card";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

interface LeaderboardCardProps {
  electionId?: string | number;
}

export function CandidatesLeaderboard({ electionId }: LeaderboardCardProps) {
  const navigate = useNavigate();
  const fetchCandidates = useServerFn(getElectionCandidates);

  const { data, isFetching } = useQuery({
    queryKey: ["election-candidates", electionId],
    queryFn: () =>
      fetchCandidates({ data: { electionId: electionId!, limit: 3 } }),
    enabled: !!electionId,
    // Clear stale data immediately when electionId changes so the previous
    // election's candidates never flash while the new fetch is in-flight.
    placeholderData: undefined,
    staleTime: 0,
  });

  const candidates = data?.data?.candidates || data?.candidates || [];

  return (
    <LeaderboardCardWrapper className="mx-2.5">
      {isFetching ? (
        <div className="flex items-center justify-center h-full flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !electionId ? (
        <div className="flex items-center justify-center h-full flex-1 text-neutral-500 text-sm">
          Select an election to see candidates
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex items-center justify-center h-full flex-1 text-neutral-500 text-sm">
          No candidates found
        </div>
      ) : (
        candidates.map((candidate: any, index: number) => (
          <LeaderboardCardRow
            key={candidate.id}
            rank={index + 1}
            avatarUrl={candidate.avatar}
            name={`${candidate.first_name} ${candidate.last_name}`}
            votesCount={`${candidate.votes_count || 0} votes`}
          />
        ))
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
