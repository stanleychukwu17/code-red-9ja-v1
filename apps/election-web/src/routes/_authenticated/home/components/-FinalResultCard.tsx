import { useQuery } from "@tanstack/react-query";
import { getFinalResult } from "#/lib/server/polling_unit_results";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./-Shared";

interface FinalResultCardProps {
  electionId?: number | null;
  pollingUnitId?: number | null;
}

export function FinalResultCard({ electionId, pollingUnitId }: FinalResultCardProps) {
  const { data: finalResultData, isLoading } = useQuery({
    queryKey: ["finalResult", electionId, pollingUnitId],
    enabled: !!electionId && !!pollingUnitId,
    queryFn: async () => {
      const res = await getFinalResult({
        data: { election_id: electionId!, polling_unit_id: pollingUnitId! },
      });
      if (!res?.success || !res.final_result) return null;
      return res.final_result;
    },
  });

  if (!electionId || !pollingUnitId) return null;
  if (isLoading) return null;
  if (!finalResultData) return null;

  let candidates = [];
  try {
    if (typeof finalResultData.candidate_results === 'string') {
      candidates = JSON.parse(finalResultData.candidate_results);
    } else {
      candidates = finalResultData.candidate_results;
    }
  } catch (e) {
    // Ignore parse error
  }

  // Sort candidates by vote count descending
  candidates.sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));

  return (
    <GreyCardWrapper>
      <GreyCardTopRow title="Polling Unit Final Result" subtitle={`Confidence: ${finalResultData.confidence_level?.toUpperCase()}`} />
      <GreyCardTitle label={`Based on ${finalResultData.matching_submissions_count} matching submissions.`} />

      <div className="mt-4 flex flex-col gap-2">
        {candidates.slice(0, 3).map((c: any, i: number) => (
          <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
            <span className="font-bold text-neutral-800">{c.party_short_name}</span>
            <span className="font-semibold text-emerald-600">{c.vote_count} votes</span>
          </div>
        ))}
      </div>
    </GreyCardWrapper>
  );
}
