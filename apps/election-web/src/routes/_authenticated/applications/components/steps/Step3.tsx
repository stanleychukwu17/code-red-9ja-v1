import { useEffect, useMemo } from "react";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { AlertCircle, Loader2 } from "lucide-react";
import { useElectionGroups } from "#/hooks/useElectionGroups";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 6: Election ballot selection checklist */
export const Step3 = () => {
  const { selectedElectionId, setSelectedElectionId } = useApplyContext();

  const { data: elections = [], isLoading: electionsLoading } = useElectionGroups();

  const acceptingElections = useMemo(
    () => elections.filter((election: any) => election.accepts_agents !== false),
    [elections]
  );
  const hasAcceptingElections = acceptingElections.length > 0;

  // If there is only one available election that accepts agents and nothing is selected yet, auto-select it
  useEffect(() => {
    if (!selectedElectionId && acceptingElections.length === 1 && acceptingElections[0]) {
      setSelectedElectionId(acceptingElections[0].id);
    }
  }, [acceptingElections, selectedElectionId, setSelectedElectionId]);

  // If the previously selected election is not accepting agents, deselect it
  useEffect(() => {
    if (selectedElectionId) {
      const selected = elections.find((e: any) => e.id === selectedElectionId);
      if (selected && selected.accepts_agents === false) {
        setSelectedElectionId(null);
      }
    }
  }, [elections, selectedElectionId, setSelectedElectionId]);

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <div className="space-y-2">
        <StepHeader
          title="Choose an Election"
          subtitle="Select the election you would like to serve as a polling unit agent."
        />
      </div>

      {!electionsLoading && elections.length > 0 && !hasAcceptingElections && (
        <div className="p-4 bg-red/10 border border-red/20 text-red rounded-2xl text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>
            None of the election groups are currently accepting polling agent applications. Please check back later.
          </span>
        </div>
      )}

      <div className="space-y-3 pr-1">
        {electionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : elections.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No elections available at the moment.
          </div>
        ) : (
          elections.map((election: any) => {
            const isAccepting = election.accepts_agents !== false;
            const isSelected = selectedElectionId === election.id;

            return (
              <SelectableCard
                key={election.id}
                title={election.name}
                subtitle={isAccepting ? election.date : `${election.date} • Not accepting agents`}
                isSelected={isSelected}
                disabled={!isAccepting}
                onClick={() => {
                  if (!isAccepting) return;
                  setSelectedElectionId(isSelected ? null : election.id);
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
