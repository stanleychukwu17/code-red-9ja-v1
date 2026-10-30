import { useEffect } from "react";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { Loader2 } from "lucide-react";
import { useElectionGroups } from "#/hooks/useElectionGroups";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 6: Election ballot selection checklist */
export const Step3 = () => {
  const { selectedElectionId, setSelectedElectionId } = useApplyContext();

  const { data: elections = [], isLoading: electionsLoading } = useElectionGroups();

  // If there is only one available election and nothing is selected yet, auto-select it
  useEffect(() => {
    if (!selectedElectionId && elections.length === 1 && elections[0]) {
      setSelectedElectionId(elections[0].id);
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
            const isSelected = selectedElectionId === election.id;

            return (
              <SelectableCard
                key={election.id}
                title={election.name}
                subtitle={election.date}
                isSelected={isSelected}
                onClick={() => {
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
