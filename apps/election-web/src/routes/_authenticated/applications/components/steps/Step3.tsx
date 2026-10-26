import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { toast } from "sonner";
import { useElectionGroups } from "#/hooks/useElectionGroups";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 3: Election ballot selection checklist */
export const Step3 = () => {
  const {
    selectedElectionIds,
    setSelectedElectionIds,
    appliedElectionGroupIds,
  } = useApplyContext();

  const { data: elections = [] } = useElectionGroups();

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <div className="space-y-2">
        <StepHeader
          title="Choose an Election"
          subtitle="Select all elections you would like to be a polling unit agent."
        />
      </div>
      <div className="space-y-3 pr-1">

        {elections.map((election: any) => {
          const isSelected = selectedElectionIds.includes(election.id);
          const isAlreadyApplied = appliedElectionGroupIds?.includes(
            election.id,
          );

          return (
            <SelectableCard
              key={election.id}
              title={election.name}
              subtitle={isAlreadyApplied ? "Already Applied" : election.date}
              isSelected={isSelected}
              disabled={isAlreadyApplied}
              onClick={() => {
                if (isAlreadyApplied) {
                  toast.error(
                    "You already have an active application for this election.",
                    { position: "top-center" },
                  );
                  return;
                }
                setSelectedElectionIds((prev: any[]) =>
                  isSelected
                    ? prev.filter((id) => id !== election.id)
                    : [...prev, election.id],
                );
              }}
            />
          );
        })}

      </div>
    </div>
  );
};
