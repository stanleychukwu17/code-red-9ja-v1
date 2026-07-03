import { Button } from "@repo/ui/components/button";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getElectionCandidates } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

interface LeaderboardCardProps {
  electionId?: string | number;
}

export function LeaderboardCard({ electionId }: LeaderboardCardProps) {
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
    <section className="bg-[#111111] text-white rounded-[28px] py-2.5 flex flex-col gap-2.5 shadow-md select-none">
      <div className="flex flex-col min-h-[168px]">
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
            <div
              key={candidate.id}
              className="h-[56px] flex items-center justify-between px-4"
            >
              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0">
                  <img
                    src={candidate.avatar || "/default-avatar.png"}
                    alt={`${candidate.first_name} ${candidate.last_name}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-white text-[16px]">
                  {candidate.first_name} {candidate.last_name}
                </span>
              </div>

              {/* Right: Votes & Rank */}
              <div className="flex items-center gap-6">
                <span className="text-white font-medium text-[16px]">
                  {candidate.votes_count || 0} votes
                </span>
                <span className="text-neutral-500 font-bold text-[16px] w-6 text-right">
                  #{index + 1}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-2 px-4">
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
    </section>
  );
}
