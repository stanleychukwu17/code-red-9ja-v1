import { Button } from "@repo/ui/components/button";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useUserParty } from "#/hooks/useUserParty";
import { useQuery } from "@tanstack/react-query";
import {
  getPotentialPayout,
  getEstimatePayout,
} from "#/lib/server/practice_tests";

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
  // Read contextual election session, user assignments, and party info from modular hooks
  const { selectedElectionGroup } = useElection();
  const { selectedAssignment } = useAssignments();
  const { party } = useUserParty();

  const assignmentId = selectedAssignment?.id;
  // Switch task milestone between election kickoff and election conclusion
  const taskType = hasStarted ? "election_end" : "election_start";

  // Query potential payout reward for submitting this status report
  const { data: potentialPayout } = useQuery({
    queryKey: [
      "taskPayout",
      taskType,
      assignmentId ?? "no-assignment",
      selectedElectionGroup?.id,
      party?.id,
    ],
    queryFn: async () => {
      // 1. If assigned to a polling unit, fetch the specific configured payout for this assignment
      if (assignmentId) {
        const res = await getPotentialPayout({
          data: { assignmentId, taskType },
        });
        if (res?.success && res.data?.payout) {
          // Convert amount from kobo to naira
          return (res.data.payout.potential_payout_kobo ?? 0) / 100;
        }
      }

      // 2. Fallback: Retrieve estimated role payout for polling agents in this party and election group
      const estRes = await getEstimatePayout({
        data: {
          taskType,
          role: "polling_agent",
          electionGroupId: selectedElectionGroup?.id ?? undefined,
          partyId: party?.id ?? undefined,
        },
      });
      if (estRes?.success && estRes.data?.payout) {
        return (estRes.data.payout.potential_payout_kobo ?? 0) / 100;
      }
      return undefined;
    },
  });

  // Format payout as currency (defaulting to ₦1,200 placeholder if unconfigured)
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
        className="rounded-[16px] mt-1 text-lg font-bold h-[52px]"
        onClick={hasStarted ? onEndClick : onStartClick}
      >
        {hasStarted ? "Yes, it has ended" : "Yes, it has started"}
      </Button>
    </GreyCardWrapper>
  );
}
