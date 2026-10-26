import { IconInput } from "@repo/ui/components/input";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StepHeader } from "./shared/StepHeader";

/** Step 2: Political party affiliation selection (locks to user's registered party if set) */
export const Step2 = ({
  searchQuery,
  setSearchQuery,
  partiesLoading,
  filteredParties,
  selectedPartyId,
  setSelectedPartyId,
  lockedPartyId,
}: any) => {
  const PartyCard = ({
    party,
    isSelected,
    isDisabled,
    onClick,
  }: {
    party: any;
    isSelected: boolean;
    isDisabled: boolean;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4.5 rounded-2xl transition ${
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${isSelected ? "bg-secondary/20" : "hover:bg-neutral-50 bg-white"}`}
    >
      <div className="flex items-center gap-3">
        {party.logo ? (
          <img
            src={party.logo}
            alt={party.short_name}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full ${
              party.logoColor || "bg-neutral-850"
            } flex items-center justify-center text-white text-xs shrink-0`}
          >
            {party.short_name}
          </div>
        )}
        <div>
          <p className="text-[16px] text-neutral-900 leading-tight">
            {party.name} ({party.short_name})
          </p>
          {!party.is_verified && (
            <span className="text-[13px] text-red-500 font-medium">
              Not onboarded yet
            </span>
          )}
          {party.is_verified && !party.is_accepting_applications && (
            <span className="text-[13px] text-orange-500 font-medium">
              Not accepting applications currently
            </span>
          )}
        </div>
      </div>
      {isSelected && <Check className="size-6" />}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader title="Choose a Political Party" />
      <IconInput
        placeholder="Search..."
        className="h-14 rounded-full"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="space-y-1.5">
        {partiesLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          </div>
        ) : filteredParties.length > 0 ? (
          filteredParties.map((party: any) => {
            const isSelected = selectedPartyId === party.id;
            const isLocked = lockedPartyId && lockedPartyId !== party.id;
            const isNotVerified = !party.is_verified;
            const isNotAccepting =
              party.is_verified && !party.is_accepting_applications;
            const isDisabled = isLocked || isNotVerified || isNotAccepting;

            return (
              <PartyCard
                key={party.id}
                party={party}
                isSelected={isSelected}
                isDisabled={isDisabled}
                onClick={() => {
                  if (isLocked) {
                    toast.error(
                      "You can only change party if your existing application is either rejected or cancelled.",
                      { position: "top-center" },
                    );
                    return;
                  }
                  if (isNotVerified) {
                    toast.error(
                      "This party has not been onboarded yet. You cannot select it.",
                      { position: "top-center" },
                    );
                    return;
                  }
                  if (isNotAccepting) {
                    toast.error(
                      "This party is currently not accepting applications.",
                      { position: "top-center" },
                    );
                    return;
                  }
                  setSelectedPartyId(party.id);
                }}
              />
            );
          })
        ) : (
          <p className="text-center text-neutral-400 py-8 text-sm">
            No parties found matching "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  );
};
