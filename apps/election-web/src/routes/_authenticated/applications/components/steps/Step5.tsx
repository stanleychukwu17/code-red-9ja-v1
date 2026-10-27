import { getLGAs } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";
import { getWards } from "#/lib/server/wards";
import { DescriptiveText } from "@repo/ui/components/custom/Texts";
import { Input, Label } from "@repo/ui/components/input";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 5: Residential address and geographic cascading selection (State -> LGA -> Ward -> Street) */
export const Step5 = () => {
  const {
    selectedStateId,
    setSelectedStateId,
    selectedLgaId,
    setSelectedLgaId,
    selectedWardId,
    setSelectedWardId,
    streetAddress,
    setStreetAddress,
  } = useApplyContext();

  console.log({ selectedStateId, selectedLgaId, selectedWardId, streetAddress });

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Add Your Current Address"
        subtitle="Provide the accurate details of where you currently stay."
      />
      <div className="space-y-7 pr-1">
        <div className="flex flex-col gap-2">
          <Label title="Which state are you currently in?" />
          <SelectState
            selectedId={selectedStateId || undefined}
            update={(stateObj) => {
              const nextStateId = stateObj?.id || null;
              if (nextStateId !== selectedStateId) {
                setSelectedStateId(nextStateId);
                setSelectedLgaId(null);
                setSelectedWardId(null);
              }
            }}
            fetchStates={getStates}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label title="Which LGA do you stay in?" />
          <SelectLga
            selectedId={selectedLgaId || undefined}
            update={(lgaObj) => {
              const nextLgaId = lgaObj?.id || null;
              if (nextLgaId !== selectedLgaId) {
                setSelectedLgaId(nextLgaId);
                setSelectedWardId(null);
              }
            }}
            stateId={selectedStateId || undefined}
            disabled={!selectedStateId}
            fetchLGAs={getLGAs}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label title="Which ward do you stay in?" />
          <SelectWard
            selectedId={selectedWardId || undefined}
            update={(wardObj) => setSelectedWardId(wardObj?.id || null)}
            stateId={selectedStateId || undefined}
            lgaId={selectedLgaId || undefined}
            disabled={!selectedLgaId}
            fetchWards={getWards}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label title="Tell us your address?" />
          <Input
            placeholder="Enter address"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
          />
        </div>

        <DescriptiveText
          text="Entering an inaccurate address could lead to you not getting accepted by your party of choice."
        />
      </div>
    </div>
  );
};
