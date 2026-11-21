import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useElection } from "#/hooks/useElection";
import { getElectionsByGroup } from "#/lib/server/elections";

/**
 * Lists the elections under the active election group that are under the user's watch.
 */
export function UnderYourWatchCard() {
  const { selectedElectionGroup } = useElection();

  const { data: elections = [] } = useQuery({
    queryKey: ["groupElections", selectedElectionGroup?.id],
    enabled: false,
    queryFn: async () => {
      const res = await getElectionsByGroup({
        data: selectedElectionGroup!.id,
      });
      if (!res?.success || !res.data?.elections) return [];
      return (res.data.elections as any[]).sort(
        (a, b) => (a.rank || 0) - (b.rank || 0),
      );
    },
  });

  if (elections.length === 0) return null;

  return (
    <section className="w-full max-w-110 px-5 py-2 flex flex-col gap-4">
      <div className="bg-sidebar-softer/60 px-4 py-2.5 rounded-md w-fit">
        <h3 className="text-sm font-bold text-c-90">Under your watch today</h3>
      </div>

      <ul className="flex flex-col gap-4">
        {elections.map((election: any) => (
          <li key={election.id} className="flex items-center gap-3.5">
            <CircleCheck
              className="size-6 text-[#5B21B6] shrink-0"
              strokeWidth={1.75}
            />
            <span className="text-base font-bold text-c-90">
              {election.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
