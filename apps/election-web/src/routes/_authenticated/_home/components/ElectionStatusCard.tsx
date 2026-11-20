import { Button } from "@repo/ui/components/button";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { useAgentAllocations } from "#/hooks/useAgentAllocations";

/**
 * Configuration options for `ElectionStatusCard`.
 */
interface ElectionStatusCardProps {
  /** Whether the election has already started at this polling unit */
  hasStarted?: boolean;
  /** Callback triggered when the agent reports that election has commenced */
  onStartClick?: () => void;
  /** Callback triggered when the agent reports that voting has concluded */
  onEndClick?: () => void;
}

/**
 * Dashboard card prompting polling unit agents to report the commencement or conclusion
 * of voting at their assigned polling unit.
 *
 * Displays the potential payout reward for completing the milestone report.
 */
export function ElectionStatusCard({
  hasStarted = false,
  onStartClick,
  onEndClick,
}: ElectionStatusCardProps) {
  // Switch task milestone between election kickoff and election conclusion
  const taskType = hasStarted ? "election_end" : "election_start";

  // Query potential payout reward from the shared allocations cache
  const { getPayoutNaira } = useAgentAllocations();
  const potentialPayout = getPayoutNaira(taskType);

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

      {/* Dynamic question prompting agent based on voting progress */}
      <GreyCardTitle
        label={
          hasStarted
            ? "Has election ended at your polling unit?"
            : "Has election started at your polling unit?"
        }
      />

      {/* Action button to open election-start or election-end reporting flow */}
      <Button
        type="button"
        variant="secondary"
        className="rounded-2xl mt-1 text-lg font-bold h-[52px]"
        onClick={hasStarted ? onEndClick : onStartClick}
      >
        {hasStarted ? "Yes, it has ended" : "Yes, it has started"}
      </Button>
    </GreyCardWrapper>
  );
}
