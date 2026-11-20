import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { useAssignments } from "#/hooks/useAssignments";
import { useAgentAllocations } from "#/hooks/useAgentAllocations";

/**
 * Props for `ArrivalCard`.
 */
interface ArrivalCardProps {
  /** Callback invoked when the agent confirms their arrival at the polling unit */
  onArrivedClick: () => void;
}

/**
 * Dashboard card prompting polling unit agents to confirm their physical arrival
 * and check-in at their assigned polling unit on election morning.
 *
 * Displays the location details (Polling Unit, Ward, LGA, State) and the
 * potential payout reward for completing the attendance verification milestone.
 */
export function ArrivalCard({ onArrivedClick }: ArrivalCardProps) {
  const { pollingUnitAssignment } = useAssignments();
  const { getPayoutNaira } = useAgentAllocations();
  const potentialPayout = getPayoutNaira("attendance");

  // Extract assigned location hierarchy labels with safe fallbacks
  const pollingUnit = pollingUnitAssignment?.polling_unit_name || "Polling Unit";
  const state = pollingUnitAssignment?.state_name || "State";
  const lga = pollingUnitAssignment?.lga_name || "LGA";
  const ward = pollingUnitAssignment?.ward_name || "Ward";

  // Format payout as currency (defaulting to ₦1,200 placeholder if un-configured)
  const formattedPayout =
    potentialPayout !== undefined
      ? `₦${potentialPayout.toLocaleString()}`
      : "₦1,200";

  return (
    <GreyCardWrapper>
      {/* Incentive header showing potential payout */}
      <GreyCardTopRow
        title={"Potential payout"}
        subtitle={formattedPayout}
        icon={<FancyMoneyBagIcon className="size-5" />}
      />

      {/* Callout title asking for arrival confirmation */}
      <GreyCardTitle label="Have you arrived at your polling unit?" />

      {/* Polling unit location details */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <PollingUnitIcon className="shrink-0 size-7 text-c-60" />
          <span className="text-c-50">Your Polling Unit</span>
        </div>
        <p className="w-full font-semibold text-c-80 leading-6">
          {pollingUnit}
        </p>
        <p className="text-sm text-c-50 mt-1">
          State: {state} | LGA: {lga} | Ward: {ward}
        </p>
      </div>

      {/* Action button navigating to the arrival recording flow */}
      <Button
        type="button"
        variant="purple"
        className="rounded-2xl mt-3 text-lg"
        size="4xl"
        onClick={onArrivedClick}
      >
        Yes, I've arrived
      </Button>
    </GreyCardWrapper>
  );
}
